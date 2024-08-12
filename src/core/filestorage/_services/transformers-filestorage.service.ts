import { AbstractService } from '~/_common/abstracts/abstract.service';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Filestorage } from '~/core/filestorage/_schemas/filestorage.schema';

@Injectable()
export class TransformersFilestorageService extends AbstractService {
  public static readonly TRANSFORMERS = {
    'text/plain': TransformersFilestorageService.transformPlain,
    'text/html': TransformersFilestorageService.transformHtml,
    'application/pdf': TransformersFilestorageService.transformPdf,
    'image/*': TransformersFilestorageService.transformImage,
  };

  public constructor() {
    super();
  }

  public async transform(
    mime: string,
    res: Response,
    data: Filestorage,
    stream: NodeJS.ReadableStream,
    parent?: Filestorage,
  ): Promise<void> {
    const mimeType = mime || data.mime || 'application/octet-stream';
    const hasTransformer = TransformersFilestorageService.TRANSFORMERS.hasOwnProperty(mimeType);
    // TransformersFilestorageService.TRANSFORMERS.hasOwnProperty(mimeType) || TransformersFilestorageService.TRANSFORMERS.hasOwnProperty(mimeType.split('/')[0] + '/*')
    if (!hasTransformer) {
      if (TransformersFilestorageService.TRANSFORMERS.hasOwnProperty(mimeType.split('/')[0] + '/*')) {
        await TransformersFilestorageService.TRANSFORMERS[mimeType.split('/')[0] + '/*'](mime, res, data, stream);
        return;
      }
    }
    if (!hasTransformer) {
      res.setHeader('Content-Type', mimeType);
      // eslint-disable-next-line
      res.setHeader('Content-Disposition', `attachment; filename="${(data as any).filename}"`)
      stream.pipe(res);
      return;
    }
    await TransformersFilestorageService.TRANSFORMERS[mimeType](mime, res, data, stream);
  }

  public static async transformPlain(
    _: string,
    res: Response,
    data: Filestorage,
    stream: NodeJS.ReadableStream,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/plain');
    // eslint-disable-next-line
    res.setHeader('Content-Disposition', `inline; filename="${(data as any).filename}"`)
    stream.pipe(res);
    return;
  }

  public static async transformPdf(
    _: string,
    res: Response,
    data: Filestorage,
    stream: NodeJS.ReadableStream,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/pdf');
    // eslint-disable-next-line
    res.setHeader('Content-Disposition', `inline; filename="${(data as any).filename}"`)
    stream.pipe(res);
    return;
  }

  public static async transformHtml(
    _: string,
    res: Response,
    data: Filestorage,
    stream: NodeJS.ReadableStream,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/html');
    // eslint-disable-next-line
    res.setHeader('Content-Disposition', `inline; filename="${(data as any).filename}"`)
    res.render('core/filestorage/transformers/html', {
      data,
      html: await TransformersFilestorageService.streamToString(stream),
    });
  }

  public static async transformImage(
    mime: string,
    res: Response,
    data: Filestorage,
    stream: NodeJS.ReadableStream,
  ): Promise<void> {
    res.setHeader('Content-Type', 'image/' + mime.split('/').pop());
    // eslint-disable-next-line
    res.setHeader('Content-Disposition', `inline; filename="${(data as any).filename}"`)
    stream.pipe(res);
    return;
  }

  private static async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }
}
