import { Logger } from "@nestjs/common"
import { InjectConnection } from "@nestjs/mongoose"
import { Connection } from "mongoose"

export default class EmployeeNumber1729092595 {
  public constructor(@InjectConnection() private connection: Connection) {

  }

  public async up(): Promise<void> {
    Logger.log('EmployeeNumber1729092595 up')

    Logger.log('this.connection.readyState', this.connection.readyState)

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        Logger.log('EmployeeNumber1729092595 up in progress')
      }, 1_000)

      setTimeout(() => {
        clearInterval(interval)
        Logger.log('EmployeeNumber1729092595 up done')
1729092595
        resolve()
      }, 5_000)
    })
  }

  public async down(): Promise<void> {
    Logger.log('EmployeeNumber1729092595 down')
  }
}
