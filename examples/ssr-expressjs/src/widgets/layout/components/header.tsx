import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model";
import { LayoutVM } from "../model";
import { Button, Link } from "@heroui/react";
import { ChevronDown, GridIcon, SearchIcon } from "lucide-react";
import { Navbar } from "./navbar";


export const Header = observer(() => {
  const model = useViewModel<LayoutVM>();
  const { appName } = model.globals.stores.appInfo
  
  return (
    <header className="sticky top-0 z-20 w-full max-w-[1416px] rounded-b-[32px] flex flex-col items-center justify-center bg-contrast-bg px-4 pb-0 pt-3" ref={model.headerRef}>
    <div className="mx-auto flex -mt-2 w-full items-center gap-3">
      <Link
        aria-label={appName}
        className="shrink-0 no-underline"
        href={model.appNameLink}
      >
        <span className="text-brand text-[38px] font-black uppercase leading-none tracking-[-0.08em]">
          {appName}
        </span>
      </Link>

      <Button
        className="bg-brand h-10 shrink-0 rounded-2xl px-4 text-sm font-semibold text-white shadow-none"
      >
        <span className="flex items-center gap-2">
          <GridIcon className="size-4" />
          <span>Каталог</span>
        </span>
      </Button>

      <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border-2 border-brand bg-contrast-bg">
        <button
          className="ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] bg-slate-100 px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200"
          type="button"
        >
          <span>Везде</span>
          <ChevronDown className="size-3.5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center px-3">
          <input
            aria-label={`Искать на ${appName}`}
            className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder={`Искать на ${appName}`}
            type="text"
          />
        </div>
        <Button
          isIconOnly
          aria-label="Искать"
          className="bg-brand h-10 w-11 rounded-none text-white"
        >
          <SearchIcon className="size-4" />
        </Button>
      </div>
      <Navbar />
    </div>
    {!model.isHeaderCompact && <div className="mx-auto mt-3 flex w-full items-center gap-4 overflow-x-auto text-xs text-slate-500">
      {model.quickLinks.map(({ href, label }) => (
        <Link
          key={label}
          className="shrink-0 font-medium text-slate-500 no-underline transition-colors hover:text-slate-900"
          href={href}
        >
          {label}
        </Link>
      ))}
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-xs text-slate-400">Пункт GOZ0N</span>
        <button
          className="text-xs font-medium text-slate-700 underline transition-colors hover:text-slate-950"
          type="button"
        >
          Выберите адрес
        </button>
      </div>
    </div>}
  </header>
  )
})