"use client"

// Palette de commandes (⌘K). Le registre shadcn `base-nova` la construit sur `cmdk` ;
// cette version garde la même API mais repose sur Base UI `Autocomplete` (liste en
// ligne, filtrage, navigation clavier, groupes, état vide), sans dépendance nouvelle.
// Les éléments se passent par `items` (plat ou en groupes `{ value, items }`) et se
// rendent avec les enfants-fonction de `CommandList` / `CommandCollection`.

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Root> & {
  className?: string
}) {
  return (
    <AutocompletePrimitive.Root inline autoHighlight="always" {...props}>
      <div
        data-slot="command"
        className={cn(
          "flex size-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground",
          className
        )}
      >
        {children}
      </div>
    </AutocompletePrimitive.Root>
  )
}

function CommandDialog({
  title = "Palette de commandes",
  description = "Rechercher une page, un CV ou une mission…",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          "top-[18%] translate-y-0 gap-0 overflow-hidden rounded-xl p-0 sm:max-w-lg",
          className
        )}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex h-11 items-center gap-2 border-b border-border px-3"
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <AutocompletePrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-full w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.List>) {
  return (
    <AutocompletePrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-80 scroll-py-1 overflow-x-hidden overflow-y-auto p-1 outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  heading,
  children,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Group> & {
  heading?: React.ReactNode
}) {
  return (
    <AutocompletePrimitive.Group
      data-slot="command-group"
      className={cn("overflow-hidden py-1 text-foreground", className)}
      {...props}
    >
      {heading != null ? (
        <AutocompletePrimitive.GroupLabel
          data-slot="command-group-heading"
          className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
        >
          {heading}
        </AutocompletePrimitive.GroupLabel>
      ) : null}
      {children}
    </AutocompletePrimitive.Group>
  )
}

function CommandCollection(
  props: React.ComponentProps<typeof AutocompletePrimitive.Collection>
) {
  return <AutocompletePrimitive.Collection {...props} />
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto font-mono text-xs text-muted-foreground group-data-highlighted/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandCollection,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
