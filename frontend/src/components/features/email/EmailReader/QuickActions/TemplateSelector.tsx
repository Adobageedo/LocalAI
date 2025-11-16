import React, { useState } from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { DefaultButton, IContextualMenuProps, Stack } from '@fluentui/react';
import { theme } from '../../../../../styles';

interface TemplateOption {
  key: string;
  text: string;
  template: string;
}

const TemplateSelector: React.FC = () => {
  const { insertTemplate, currentEmail } = useOffice();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);

  const templates: TemplateOption[] = [
    {
      key: 'infoPDP',
      text: 'Demande Info PDP',
      template: `
        <div style="font-family: Aptos, sans-serif; font-size: 16px; color: black;">
          Bonjour,
          <div>Dans le cadre de la préparation du plan de prévention (PDP) pour votre intervention sur le parc éolien, pourrais-tu me transmettre l'analyse de risque ainsi que le mode opératoire ?</div>
          <div>Nous aurions également besoin des coordonnées de vos intervenants sur site ainsi que de leurs habilitations.</div>
          <div>De plus, merci de bien vouloir remplir le tableau ci-dessous et de me le renvoyer complété :</div>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Aptos, sans-serif;">
            <tr>
              <th style="width: 200px; text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Raison sociale</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Adresse</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Téléphone</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Représentant légal</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Représentant sur site</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Téléphone</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">E-mail</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
          </table>
          Merci d'avance pour ton retour.
          Cordialement,
        </div>
      `
    },
    {
      key: 'prodInvoice',
      text: 'Mail Facture Prod',
      template: `
        <div style="font-family: Aptos, sans-serif; font-size: 16px; color: black;">
          Bonjour,
          <div>Dans le cadre de la préparation du plan de prévention (PDP) pour votre intervention sur le parc éolien, pourrais-tu me transmettre l'analyse de risque ainsi que le mode opératoire ?</div>
          <div>Nous aurions également besoin des coordonnées de vos intervenants sur site ainsi que de leurs habilitations.</div>
          <div>De plus, merci de bien vouloir remplir le tableau ci-dessous et de me le renvoyer complété :</div>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Aptos, sans-serif;">
            <tr>
              <th style="width: 200px; text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Raison sociale</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Adresse</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Téléphone</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Représentant légal</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Représentant sur site</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">Téléphone</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f2f2f2; border: 1px solid #ddd;">E-mail</th>
              <td style="padding: 10px; border: 1px solid #ddd;"></td>
            </tr>
          </table>
          Merci d'avance pour ton retour.
          Cordialement,
        </div>
      `
    },
    {
      key: 'requestInvoicePO',
      text: 'Demande Facture avec PO',
      template: `
        <div style="font-family: Aptos, sans-serif; font-size: 16px; color: black;">
          Bonjour,
          <div>Pouvez-vous rajouter sur la facture le bon de commande : [Numéro PO]</div>
          <div>et l'envoyer à <a href="mailto:invoices@akuoenergy.com">invoices@akuoenergy.com</a> et moi en copie ?</div>
          Cordialement,
        </div>
      `
    }
  ];

  const handleInsertTemplate = async (template: TemplateOption) => {
    if (currentEmail) {
      await insertTemplate(template.template);
      setSelectedTemplate(template);
    }
  };

  const menuProps: IContextualMenuProps = {
    items: templates.map(template => ({
      key: template.key,
      text: template.text,
      onClick: () => {
        handleInsertTemplate(template);
      },
    })),
  };

  return (
    <DefaultButton
      text={selectedTemplate ? "Modele Email - " + selectedTemplate.text : 'Modele Email'}
      menuProps={menuProps}
      disabled={!currentEmail}
      styles={{
        root: {
          width: 220,
          height: 50,
          fontWeight: 600,
          borderRadius: theme.effects.roundedCorner2,
          boxShadow: theme.effects.elevation8,
          backgroundColor: theme.colors.primary,
          color: theme.colors.white,
          border: 'none',
          ':hover': {
            backgroundColor: theme.colors.primaryDark,
            color: theme.colors.white,
          },
          ':active': {
            backgroundColor: theme.colors.primaryDark,
          },
        },
        menuIcon: {
          color: theme.colors.white,
        },
        label: {
          fontWeight: 600,
        },
      }}
    />
  );
};

export default TemplateSelector;
