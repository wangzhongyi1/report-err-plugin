import * as ErrorStackParser from 'error-stack-parser'

export interface IErrJson {
  timestamp: Date
  href: Location['href']
  stack?: ErrorStackParser.StackFrame[]
  name?: string
  message?: string
}

export interface IOption {
  maxSize: number
  reportFunc: (waitReportList: IErrJson[]) => void
}

export default class reportErrPlugin {
  public option: IOption
  public waitReportList: IErrJson[]

  constructor (option: IOption)

  report (err: Error): void

  forceReport (): void

  clearReportList (): void

  install(app: any): void

}