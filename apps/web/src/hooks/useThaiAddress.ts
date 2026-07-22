import * as React from "react";

export interface Province {
  id: number;
  name_th: string;
  name_en: string;
  districts: District[];
}

export interface District {
  id: number;
  name_th: string;
  name_en: string;
  sub_districts: SubDistrict[];
}

export interface SubDistrict {
  id: number;
  name_th: string;
  name_en: string;
  zip_code: number;
}

export function useThaiAddress() {
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Address Dropdown States (IDs stored as strings)
  const [provinceId, setProvinceId] = React.useState<string>("");
  const [districtId, setDistrictId] = React.useState<string>("");
  const [subDistrictId, setSubDistrictId] = React.useState<string>("");
  const [zipcode, setZipcode] = React.useState<string>("");

  // Pending initial text values for automatic resolution
  const [pendingInit, setPendingInit] = React.useState<{ prov?: string; dist?: string; sub?: string } | null>(null);

  // Load provinces on mount
  React.useEffect(() => {
    fetch("/data/thai-provinces.json")
      .then((res) => res.json())
      .then((data: Province[]) => {
        const sorted = [...data].sort((a, b) =>
          a.name_th.localeCompare(b.name_th, "th")
        );
        setProvinces(sorted);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load Thai provinces data:", e);
        setLoading(false);
      });
  }, []);

  // Selected Province Object derived directly
  const selectedProvinceObj = React.useMemo(() => {
    if (!provinceId) return undefined;
    return provinces.find((p) => p.id === Number(provinceId));
  }, [provinces, provinceId]);

  // Derived districts list
  const districts = React.useMemo(() => {
    if (!selectedProvinceObj) return [];
    return [...selectedProvinceObj.districts].sort((a, b) =>
      a.name_th.localeCompare(b.name_th, "th")
    );
  }, [selectedProvinceObj]);

  // Selected District Object derived directly
  const selectedDistrictObj = React.useMemo(() => {
    if (!selectedProvinceObj || !districtId) return undefined;
    return selectedProvinceObj.districts.find((d) => d.id === Number(districtId));
  }, [selectedProvinceObj, districtId]);

  // Derived subdistricts list
  const subDistricts = React.useMemo(() => {
    if (!selectedDistrictObj) return [];
    return [...selectedDistrictObj.sub_districts].sort((a, b) =>
      a.name_th.localeCompare(b.name_th, "th")
    );
  }, [selectedDistrictObj]);

  // Sync zipcode automatically whenever subDistrictId or subDistricts change
  React.useEffect(() => {
    if (!subDistrictId || subDistricts.length === 0) return;
    const matched = subDistricts.find((s) => String(s.id) === subDistrictId);
    if (matched && matched.zip_code) {
      setZipcode(String(matched.zip_code));
    }
  }, [subDistrictId, subDistricts]);

  // Effect to resolve pending text names to IDs once provinces and cascading lists are ready
  React.useEffect(() => {
    if (!pendingInit || provinces.length === 0) return;

    const { prov, dist, sub } = pendingInit;
    if (!prov) return;

    const cleanProv = prov.replace(/^(จังหวัด)/, "").trim();
    const matchedProv = provinces.find((p) => p.name_th === prov || p.name_th === cleanProv);

    if (matchedProv) {
      const pId = String(matchedProv.id);
      setProvinceId(pId);

      if (dist) {
        const cleanDist = dist.replace(/^(อำเภอ|เขต)/, "").trim();
        const matchedDist = matchedProv.districts.find((d) => d.name_th === dist || d.name_th === cleanDist);

        if (matchedDist) {
          const dId = String(matchedDist.id);
          setDistrictId(dId);

          if (sub) {
            const cleanSub = sub.replace(/^(ตำบล|แขวง)/, "").trim();
            const matchedSub = matchedDist.sub_districts.find((s) => s.name_th === sub || s.name_th === cleanSub);

            if (matchedSub) {
              setSubDistrictId(String(matchedSub.id));
              setZipcode(matchedSub.zip_code ? String(matchedSub.zip_code) : "");
            }
          }
        }
      }
    }
  }, [pendingInit, provinces]);

  // Event Handlers
  const handleProvinceChange = (id: string) => {
    setProvinceId(id);
    setDistrictId("");
    setSubDistrictId("");
    setZipcode("");
    setPendingInit(null);
  };

  const handleDistrictChange = (id: string) => {
    setDistrictId(id);
    setSubDistrictId("");
    setZipcode("");
    setPendingInit(null);
  };

  const handleSubDistrictChange = (id: string) => {
    setSubDistrictId(id);
    const subDist = subDistricts.find((s) => s.id === Number(id));
    setZipcode(subDist?.zip_code ? String(subDist.zip_code) : "");
    setPendingInit(null);
  };

  const resetAddress = () => {
    setProvinceId("");
    setDistrictId("");
    setSubDistrictId("");
    setZipcode("");
    setPendingInit(null);
  };

  // Helper to resolve string names into IDs for initialization
  const initializeAddress = React.useCallback(
    (provName?: string, distName?: string, subDistName?: string) => {
      if (!provName) return;
      setPendingInit({ prov: provName, dist: distName, sub: subDistName });
    },
    []
  );

  return {
    provinces,
    districts,
    subDistricts,
    provinceId,
    districtId,
    subDistrictId,
    zipcode,
    loading,
    handleProvinceChange,
    handleDistrictChange,
    handleSubDistrictChange,
    resetAddress,
    initializeAddress,
    getSelectedNames: () => {
      const pName = provinces.find((p) => p.id === Number(provinceId))?.name_th || "";
      const dName = districts.find((d) => d.id === Number(districtId))?.name_th || "";
      const sName = subDistricts.find((s) => s.id === Number(subDistrictId))?.name_th || "";
      return { province: pName, district: dName, subDistrict: sName, zipcode };
    },
  };
}
