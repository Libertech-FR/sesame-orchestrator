import Handlebars from 'handlebars';
import {
  buildMailTemplatePreviewContext,
  MAIL_TEMPLATE_PREVIEW_DEFAULTS,
} from '~/management/mail/mail-templates.service';

describe('buildMailTemplatePreviewContext', () => {
  it('should provide default code for reset templates', () => {
    const ctx = buildMailTemplatePreviewContext();
    expect(ctx.code).toBe(MAIL_TEMPLATE_PREVIEW_DEFAULTS.code);
  });

  it('should allow overriding preview variables', () => {
    const ctx = buildMailTemplatePreviewContext({ code: '999999' });
    expect(ctx.code).toBe('999999');
  });

  it('should not throw on unknown variables in non-strict preview mode', () => {
    const ctx = buildMailTemplatePreviewContext();
    const compiled = Handlebars.compile('Hello {{unknownVar}}', { strict: false });
    expect(() => compiled(ctx)).not.toThrow();
    expect(compiled(ctx)).toBe('Hello ');
  });

  it('should render resetaccount-style code placeholder', () => {
    const ctx = buildMailTemplatePreviewContext();
    const compiled = Handlebars.compile('Votre code : {{ code }}', { strict: false });
    expect(compiled(ctx)).toContain('123456');
  });
});
