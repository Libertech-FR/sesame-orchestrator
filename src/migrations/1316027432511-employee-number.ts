import { Logger } from "@nestjs/common"

export default class EmployeeNumber1616027432511 {
  // public constructor(@InjectConnection() private connection: Connection) {

  // }

  public async up(): Promise<void> {
    Logger.log('EmployeeNumber1616027432511 up')

    // return new Promise((resolve) => {
    //   const interval = setInterval(() => {
    //     Logger.log('EmployeeNumber1616027432511 up in progress')
    //   }, 1_000)

    //   setTimeout(() => {
    //     clearInterval(interval)
    //     Logger.log('EmployeeNumber1616027432511 up done')

    //     resolve()
    //   }, 5_000)
    // })
  }

  public async down(): Promise<void> {
    Logger.log('EmployeeNumber1616027432511 down')
  }
}
