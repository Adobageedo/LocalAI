// Helper script to add missing tabbed interface translations to all language objects
const fs = require('fs');
const path = require('path');

// Path to the i18n.ts file
const i18nFilePath = path.join(__dirname, 'i18n.ts');

// Read the file
let content = fs.readFileSync(i18nFilePath, 'utf8');

// Define the missing translations for each language
const missingTranslations = {
  // German
  de: `
    // Tabbed Interface
    replyTab: 'Antworten',
    synthesizeTab: 'Synthetisieren',
    synthesizeAttachments: 'Anhänge Synthetisieren',
    noAttachments: 'Keine Anhänge in dieser E-Mail gefunden',
    processingFile: 'Datei wird verarbeitet...',
    synthesizeFile: 'Datei Synthetisieren',
    synthesisComplete: 'Synthese abgeschlossen',
  `,
  // Portuguese
  pt: `
    // Tabbed Interface
    replyTab: 'Responder',
    synthesizeTab: 'Sintetizar',
    synthesizeAttachments: 'Sintetizar Anexos',
    noAttachments: 'Nenhum anexo encontrado neste email',
    processingFile: 'Processando arquivo...',
    synthesizeFile: 'Sintetizar Arquivo',
    synthesisComplete: 'Síntese completa',
  `,
  // Italian
  it: `
    // Tabbed Interface
    replyTab: 'Rispondere',
    synthesizeTab: 'Sintetizzare',
    synthesizeAttachments: 'Sintetizzare Allegati',
    noAttachments: 'Nessun allegato trovato in questa email',
    processingFile: 'Elaborazione del file...',
    synthesizeFile: 'Sintetizzare File',
    synthesisComplete: 'Sintesi completata',
  `,
  // Dutch
  nl: `
    // Tabbed Interface
    replyTab: 'Antwoorden',
    synthesizeTab: 'Synthetiseren',
    synthesizeAttachments: 'Bijlagen Synthetiseren',
    noAttachments: 'Geen bijlagen gevonden in deze e-mail',
    processingFile: 'Bestand verwerken...',
    synthesizeFile: 'Bestand Synthetiseren',
    synthesisComplete: 'Synthese voltooid',
  `,
  // Russian
  ru: `
    // Tabbed Interface
    replyTab: 'Ответить',
    synthesizeTab: 'Синтезировать',
    synthesizeAttachments: 'Синтезировать Вложения',
    noAttachments: 'Вложения не найдены в этом письме',
    processingFile: 'Обработка файла...',
    synthesizeFile: 'Синтезировать Файл',
    synthesisComplete: 'Синтез завершен',
  `,
  // Japanese
  ja: `
    // Tabbed Interface
    replyTab: '返信',
    synthesizeTab: '合成',
    synthesizeAttachments: '添付ファイルを合成',
    noAttachments: 'このメールに添付ファイルはありません',
    processingFile: 'ファイル処理中...',
    synthesizeFile: 'ファイルを合成',
    synthesisComplete: '合成完了',
  `,
  // Chinese
  zh: `
    // Tabbed Interface
    replyTab: '回复',
    synthesizeTab: '合成',
    synthesizeAttachments: '合成附件',
    noAttachments: '此邮件中未找到附件',
    processingFile: '处理文件中...',
    synthesizeFile: '合成文件',
    synthesisComplete: '合成完成',
  `
};

// Add missing translations to each language object
Object.keys(missingTranslations).forEach(lang => {
  // Find the position to insert the translations (before the loading: line)
  const searchPattern = new RegExp(`\\s+// ${lang === 'de' ? 'German' : 
                                    lang === 'pt' ? 'Portuguese' : 
                                    lang === 'it' ? 'Italian' : 
                                    lang === 'nl' ? 'Dutch' : 
                                    lang === 'ru' ? 'Russian' : 
                                    lang === 'ja' ? 'Japanese' : 
                                    'Chinese'}[\\s\\S]*?loading: `, 'g');
  
  const match = searchPattern.exec(content);
  if (match) {
    const insertPosition = match.index + match[0].lastIndexOf('toneApologetic:');
    const insertPositionEnd = content.indexOf(',', insertPosition) + 1;
    
    // Insert the missing translations
    content = content.substring(0, insertPositionEnd) + 
              missingTranslations[lang] + 
              content.substring(insertPositionEnd);
  }
});

// Write the updated content back to the file
fs.writeFileSync(i18nFilePath, content, 'utf8');

console.log('Added missing tabbed interface translations to all language objects');
