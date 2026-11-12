import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';
import { LdapOptions } from './_interfaces/ldap-options.interface';

/**
 * Gestion des connexions à l'annuaire LDAP (ldapts)
 *
 * Une connexion est ouverte par opération (bind → opération → unbind) :
 * les écritures d'identités sont unitaires et peu fréquentes, cela évite de gérer
 * la reconnexion d'une connexion longue durée.
 */
@Injectable()
export class LdapClientService {
  public constructor(private readonly config: ConfigService) {}

  public get options(): LdapOptions {
    return this.config.get<LdapOptions>('ldap');
  }

  public get enabled(): boolean {
    return this.options?.enabled === true;
  }

  public async withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const options = this.options;
    const client = new Client({
      url: options.url,
      timeout: options.timeout,
      connectTimeout: options.timeout,
      // ldapts ouvre une connexion TLS dès que tlsOptions est renseigné, même en ldap:// :
      // on ne le passe qu'en ldaps:// (StartTLS reçoit ses propres options ci-dessous)
      ...(/^ldaps:/i.test(options.url) ? { tlsOptions: { rejectUnauthorized: options.tlsRejectUnauthorized } } : {}),
    });

    try {
      if (options.startTLS) {
        await client.startTLS({ rejectUnauthorized: options.tlsRejectUnauthorized });
      }
      await client.bind(options.bindDN, options.bindPassword);
      return await fn(client);
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }
}
