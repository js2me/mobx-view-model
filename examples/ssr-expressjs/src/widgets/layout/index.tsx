import { ViewModelProps, withViewModel } from "mobx-view-model"
import { ReactNode } from "react"
import { LayoutVM } from "./model"
import { Header } from "./components/header"

export interface LayoutProps extends ViewModelProps<LayoutVM> {
  children: ReactNode;
}

export const Layout = withViewModel(LayoutVM, ({ children, model }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-base-bg w-full flex flex-col items-center">
      <Header />
      <div className="flex flex-col flex-1 w-full max-w-[1416px]">
        {children}
      </div>
    </div>
  )
})