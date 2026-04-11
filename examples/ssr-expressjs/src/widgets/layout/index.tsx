import { Separator } from "@heroui/react"
import { ViewModelProps, withViewModel } from "mobx-view-model"
import { ReactNode } from "react"
import { LayoutVM } from "./model"
import { Navbar } from "./components/navbar"


export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ children,  model  }: LayoutProps) => {
  return (
    <div className="flex flex-col gap-2 min-h-full">
    <div className="w-full flex flex-row items-center justify-center flex-none">
      <h1 className="text-foreground text-xl font-semibold">{model.globals.stores.appInfo.appName}</h1>
      <Separator orientation="vertical" />
      <Navbar />
    </div>
    {children}
    </div>
  )
})