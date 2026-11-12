import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LdapClientService } from './ldap-client.service';
import { LdapIdentitiesService } from './ldap-identities.service';
import { LdapImportService } from './ldap-import.service';
import { LdapMappingService } from './ldap-mapping.service';

/**
 * Module LDAP natif : écrit directement les identités dans l'annuaire (SESAME_LDAP_ENABLED=true),
 * à la place du daemon, pour les actions IDENTITY_CREATE / IDENTITY_UPDATE / IDENTITY_DELETE.
 * Au démarrage, si la base Sesame est vide, les comptes de l'annuaire sont importés (employeeType LDAP, employeeNumber = entryUUID).
 */
@Module({
  imports: [ConfigModule],
  providers: [LdapClientService, LdapMappingService, LdapIdentitiesService, LdapImportService],
  exports: [LdapIdentitiesService, LdapImportService],
})
export class LdapModule {}
