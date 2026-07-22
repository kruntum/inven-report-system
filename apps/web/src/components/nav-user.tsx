import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Palette,
  Check,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { useAppStore } from "@/store/useAppStore.ts";
import { useTheme } from "@/components/theme-provider.tsx";
import { THEME_PRESETS, getThemeConfig } from "@/lib/theme-config.ts";

export function NavUser() {
  const { isMobile } = useSidebar();
  const user = useAppStore((state) => state.user);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const { preset, mode, setPreset, setMode } = useTheme();

  if (!user) return null;

  const currentThemeConfig = getThemeConfig(preset);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                  {user.fullName ? user.fullName.charAt(0) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.fullName}</span>
                <span className="truncate text-xs text-muted-foreground">{user.username}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {user.fullName ? user.fullName.charAt(0) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.username}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {/* Light / Dark Mode Switch */}
              <DropdownMenuItem
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
                className="cursor-pointer"
              >
                {mode === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
                <span>{mode === "dark" ? "สลับโหมดสว่าง" : "สลับโหมดมืด"}</span>
              </DropdownMenuItem>

              {/* Dynamic Submenu for Unlimited Theme Presets */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Palette className="h-4 w-4 text-primary mr-2" />
                  <span className="flex-1">ธีมระบบ:</span>
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: currentThemeConfig.colorHex }}
                    />
                    {currentThemeConfig.name.split(" ")[0]}
                  </span>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-52">
                  <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground">
                    เลือกโทนสีของธีม (Theme Presets)
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {THEME_PRESETS.map((t) => {
                    const isSelected = preset === t.id;
                    return (
                      <DropdownMenuItem
                        key={t.id}
                        onClick={() => setPreset(t.id)}
                        className="cursor-pointer flex items-center justify-between text-xs py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: t.colorHex }}
                          />
                          <span className={isSelected ? "font-bold text-foreground" : "text-muted-foreground"}>
                            {t.name}
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={clearAuth} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default NavUser;
