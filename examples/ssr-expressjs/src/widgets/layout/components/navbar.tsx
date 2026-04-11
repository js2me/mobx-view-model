import { observer } from "mobx-react-lite";
import { useViewModel } from "mobx-view-model";
import { LayoutVM } from "../model";
import { Link, Separator } from "@heroui/react";
import { Fragment } from "react/jsx-runtime";

export const Navbar = observer(() => {
  const model = useViewModel<LayoutVM>()

  return (
    <div className="text-small flex h-5 items-center space-x-4">
      {model.navItems.map((it, i, arr) => {
        const isLast = i  === arr.length - 1;

        return (
          <Fragment key={i}>
            <Link href={it.path}>{it.label}</Link>
            {!isLast && <Separator orientation="vertical" />}
          </Fragment>
        )
      })}
    </div>
  )
})