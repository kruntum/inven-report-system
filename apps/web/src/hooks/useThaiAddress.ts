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

  // Derived lists
  const districts = React.useMemo(() => {
    if (!provinceId) return [];
    const prov = provinces.find((p) => p.id === Number(provinceId));
    return prov
      ? [...prov.districts].sort((a, b) => a.name_th.localeCompare(b.name_th, "th"))
      : [];
  }, [provinces, provinceId]);

  const subDistricts = React.useMemo(() => {
    if (!districtId) return [];
    const dist = districts.find((d) => d.id === Number(districtId));
    return dist
      ? [...dist.sub_districts].sort((a, b) => a.name_th.localeCompare(b.name_th, "th"))
      : [];
  }, [districts, districtId]);

  // Event Handlers
  const handleProvinceChange = (id: string) => {
    setProvinceId(id);
    setDistrictId("");
    setSubDistrictId("");
    setZipcode("");
  };

  const handleDistrictChange = (id: string) => {
    setDistrictId(id);
    setSubDistrictId("");
    setZipcode("");
  };

  // Safe handler that handles both raw string value and event object
  const handleSubDistrictChange = (id: string) => {
    setSubDistrictId(id);
    const subDist = subDistricts.find((s) => s.id === Number(id));
    setZipcode(subDist?.zip_code ? String(subDist.zip_code) : "");
  };

  const resetAddress = () => {
    setProvinceId("");
    setDistrictId("");
    setSubDistrictId("");
    setZipcode("");
  };

  // Helper to resolve string names into IDs for initialization
  const initializeAddress = React.useCallback(
    (provName?: string, distName?: string, subDistName?: string) => {
      if (provinces.length === 0 || !provName) return;

      const matchedProv = provinces.find((p) => p.name_th === provName);
      if (matchedProv) {
        setProvinceId(String(matchedProv.id));

        if (distName) {
          const matchedDist = matchedProv.districts.find((d) => d.name_th === distName);
          if (matchedDist) {
            setDistrictId(String(matchedDist.id));

            if (subDistName) {
              const matchedSub = matchedDist.sub_districts.find((s) => s.name_th === subDistName);
              if (matchedSub) {
                setSubDistrictId(String(matchedSub.id));
                setZipcode(matchedSub.zip_code ? String(matchedSub.zip_code) : "");
              }
            }
          }
        }
      }
    },
    [provinces]
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
    // Helper to get text values for submission
    getSelectedNames: () => {
      const pName = provinces.find((p) => p.id === Number(provinceId))?.name_th || "";
      const dName = districts.find((d) => d.id === Number(districtId))?.name_th || "";
      const sName = subDistricts.find((s) => s.id === Number(subDistrictId))?.name_th || "";
      return { province: pName, district: dName, subDistrict: sName, zipcode };
    },
  };
}
