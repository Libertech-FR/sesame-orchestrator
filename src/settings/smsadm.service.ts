import {Injectable} from "@nestjs/common";
import {AbstractSettingsService} from "~/_common/abstracts/abstract-settings.service";
import {SmsSettingsDto} from "~/settings/_dto/sms.settings.dto";
import {parsePhoneNumber} from "awesome-phonenumber";

@Injectable()
export class SmsService extends AbstractSettingsService {
    public async getParams():Promise <SmsSettingsDto|null>{
      const data= await this.getParameter<SmsSettingsDto>('smsServer')
      return data
    }
    public async setParams(params:SmsSettingsDto):Promise <any>{
      return await this.setParameter('smsServer',params)
    }
  public send(telNumber: string , message:string){
    this.logger.verbose('Envoi SMS : ' +telNumber + ' message :' + message)
    const params =  this.getParams()
    const host = params.host
    const systemId = params.systemId
    const password = params.password
    const sourceAddr=params.sourceAddr
    const smpp = require('smpp');
    const logger=this.logger
    //normalisation du numero de telephone
    const pTelNumber=parsePhoneNumber(telNumber,{ regionCode: params.regionCode})
    this.logger.verbose('phone number parsed :' +pTelNumber.number.e164)
    if (pTelNumber.valid === true){
      const session = smpp.connect({
        url: host,
        debug: false
      }, function() {
        session.bind_transmitter({
          system_id: systemId,
          password: password,
        }, function(pdu) {
          if (pdu.command_status === 0) {
            // Successfully bound
            session.submit_sm({
              source_addr_ton: 5,
              source_addr_npi:0,
              source_addr : sourceAddr,
              destination_addr: pTelNumber.number.e164,
              dest_addr_ton:1,
              dest_addr_npi:1,
              data_coding: 'GSM 03.38',
              short_message: message
            }, function(pdu) {
              if (pdu.command_status === 0) {
                // Message successfully sent
                console.log('SUCCESS : ' + pdu.message_id);
                logger.log('SMS SUCCESS ')
                session.unbind()
                session.close()
              }else{
                console.error('FAIL : ' + pdu.command_status)
                session.unbind()
                session.close()
              }
            });
          }
          session.on('error', function(error){
            logger.error('SMS ERREUR ' + error)
            session.unbind()
            session.close()
          })
        });
      });
    }else{
      this.logger.error( 'Numero invalide :' + telNumber)
    }


  }
}
