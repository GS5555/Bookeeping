"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    notFoundText: string;
    className?: string;
    disabled?: boolean;
}

/**
 * A portal-free Combobox that works reliably inside Dialogs.
 * Uses local absolute positioning instead of Radix Popover.
 */
export function Combobox({ options, value, onChange, placeholder, searchPlaceholder, notFoundText, className, disabled }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Handle click outside to close the dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedLabel = React.useMemo(() => {
    return options.find((option) => option.value === value)?.label || ""
  }, [options, value])

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between h-10 px-3 font-normal bg-background", className)}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-[100] w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95">
          <Command shouldFilter={true} className="w-full">
            <CommandInput 
              placeholder={searchPlaceholder} 
              autoFocus 
              className="h-10"
            />
            <CommandList className="max-h-[250px] overflow-y-auto overflow-x-hidden p-1">
              <CommandEmpty className="py-6 text-center text-sm">{notFoundText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value === value ? "" : option.value)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{option.label}</span>
                    <Check
                      className={cn(
                        "h-4 w-4 ml-2",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
