import { VM } from "@/shared/lib/vm";


export class AppNavVM extends VM {
  title = this.rootStore.appInfo.appName;

  links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/widgets', label: 'Widgets' },
    { href: '/timeline', label: 'Timeline' },
  ]
}