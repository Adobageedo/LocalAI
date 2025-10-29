/**
 * Compose Service
 * Service pour gérer la composition d'emails dans Outlook
 */

import { EmailContext } from '@/models/domain';
import { StreamChunk } from '@/models/api';

export class ComposeService {
  /**
   * Obtenir le contexte email actuel depuis Outlook
   */
  async getCurrentEmailContext(): Promise<EmailContext | null> {
    try {
      if (typeof Office === 'undefined' || !Office.context?.mailbox?.item) {
        return null;
      }

      const item = Office.context.mailbox.item;
      
      // Obtenir le sujet
      const subject = await this.getSubject(item);
      
      // Obtenir le corps
      const body = await this.getBody(item);
      
      // Obtenir les destinataires
      const to = await this.getRecipients(item);
      
      // Obtenir l'expéditeur
      const from = await this.getFrom(item);

      return {
        subject,
        body,
        to,
        from,
        language: this.detectLanguage(),
        tone: 'professional'
      };
    } catch (error) {
      console.error('Error getting email context:', error);
      return null;
    }
  }

  /**
   * Obtenir le sujet
   */
  private async getSubject(item: any): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (item.subject?.getAsync) {
        item.subject.getAsync((result: any) => {
          resolve(result.status === Office.AsyncResultStatus.Succeeded ? result.value : undefined);
        });
      } else {
        resolve(item.subject);
      }
    });
  }

  /**
   * Obtenir le corps de l'email
   */
  private async getBody(item: any): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (item.body?.getAsync) {
        item.body.getAsync('text', (result: any) => {
          resolve(result.status === Office.AsyncResultStatus.Succeeded ? result.value : undefined);
        });
      } else {
        resolve(undefined);
      }
    });
  }

  /**
   * Obtenir les destinataires
   */
  private async getRecipients(item: any): Promise<string[] | undefined> {
    return new Promise((resolve) => {
      if (item.to?.getAsync) {
        item.to.getAsync((result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            const recipients = result.value.map((r: any) => r.emailAddress);
            resolve(recipients);
          } else {
            resolve(undefined);
          }
        });
      } else if (item.to) {
        resolve([item.to]);
      } else {
        resolve(undefined);
      }
    });
  }

  /**
   * Obtenir l'expéditeur
   */
  private async getFrom(item: any): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (item.from?.emailAddress) {
        resolve(item.from.emailAddress);
      } else {
        resolve(undefined);
      }
    });
  }

  /**
   * Insérer du contenu dans l'email en cours de composition
   */
  async insertContent(content: string, mode: 'replace' | 'append' = 'replace'): Promise<void> {
    try {
      if (typeof Office === 'undefined' || !Office.context?.mailbox?.item) {
        throw new Error('Office.js not available');
      }

      const item = Office.context.mailbox.item;

      if (mode === 'replace') {
        // Remplacer tout le contenu
        await this.setBody(item, content);
      } else {
        // Ajouter à la fin
        const currentBody = await this.getBody(item) || '';
        const newBody = currentBody + '\n\n' + content;
        await this.setBody(item, newBody);
      }
    } catch (error) {
      console.error('Error inserting content:', error);
      throw error;
    }
  }

  /**
   * Définir le corps de l'email
   */
  private async setBody(item: any, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (item.body?.setAsync) {
        item.body.setAsync(
          content,
          { coercionType: Office.CoercionType.Text },
          (result: any) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error(result.error?.message || 'Failed to set body'));
            }
          }
        );
      } else {
        reject(new Error('setAsync not available'));
      }
    });
  }

  /**
   * Insérer du contenu avec streaming
   */
  async insertContentWithStreaming(
    contentStream: AsyncIterable<StreamChunk>,
    onProgress?: (chunk: string) => void
  ): Promise<void> {
    let fullContent = '';

    try {
      for await (const chunk of contentStream) {
        if (chunk.type === 'chunk' && chunk.delta) {
          fullContent += chunk.delta;
          
          // Callback de progression
          if (onProgress) {
            onProgress(chunk.delta);
          }
        } else if (chunk.type === 'error') {
          throw new Error(chunk.message || 'Streaming error');
        }
      }

      // Insérer le contenu final
      await this.insertContent(fullContent);
    } catch (error) {
      console.error('Error inserting streaming content:', error);
      throw error;
    }
  }

  /**
   * Définir le sujet
   */
  async setSubject(subject: string): Promise<void> {
    try {
      if (typeof Office === 'undefined' || !Office.context?.mailbox?.item) {
        throw new Error('Office.js not available');
      }

      const item = Office.context.mailbox.item;

      return new Promise((resolve, reject) => {
        if (item.subject?.setAsync) {
          item.subject.setAsync(subject, (result: any) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error('Failed to set subject'));
            }
          });
        } else {
          reject(new Error('setAsync not available'));
        }
      });
    } catch (error) {
      console.error('Error setting subject:', error);
      throw error;
    }
  }

  /**
   * Ajouter des destinataires
   */
  async addRecipients(emails: string[], type: 'to' | 'cc' | 'bcc' = 'to'): Promise<void> {
    try {
      if (typeof Office === 'undefined' || !Office.context?.mailbox?.item) {
        throw new Error('Office.js not available');
      }

      const item = Office.context.mailbox.item;
      const recipientField = item[type];

      if (!recipientField || !recipientField.addAsync) {
        throw new Error(`${type} field not available`);
      }

      for (const email of emails) {
        await new Promise((resolve, reject) => {
          recipientField.addAsync([email], (result: any) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve(undefined);
            } else {
              reject(new Error(`Failed to add ${type}`));
            }
          });
        });
      }
    } catch (error) {
      console.error('Error adding recipients:', error);
      throw error;
    }
  }

  /**
   * Détecter la langue depuis Office
   */
  private detectLanguage(): string {
    try {
      if (typeof Office !== 'undefined' && Office.context?.displayLanguage) {
        const lang = Office.context.displayLanguage.toLowerCase();
        const langCode = lang.split('-')[0];
        
        const supportedLangs = ['en', 'fr', 'es', 'de', 'pt', 'it', 'nl', 'ru', 'ja', 'zh'];
        return supportedLangs.includes(langCode) ? langCode : 'en';
      }
    } catch (error) {
      console.error('Error detecting language:', error);
    }
    
    return 'en';
  }

  /**
   * Vérifier si Office.js est disponible
   */
  isOfficeAvailable(): boolean {
    return typeof Office !== 'undefined' && !!Office.context?.mailbox?.item;
  }
}

/**
 * Instance singleton
 */
const composeService = new ComposeService();

export default composeService;
