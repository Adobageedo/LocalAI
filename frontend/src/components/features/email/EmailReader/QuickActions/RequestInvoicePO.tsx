import React from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton } from '@fluentui/react';
import { theme } from '../../../../../styles';

const RequestInvoicePO: React.FC = () => {
    const { insertTemplate, currentEmail } = useOffice();
  
    const handleReply = async () => {
      if (currentEmail) {
        const template = `
        <div style="font-family: Aptos, sans-serif; font-size: 16px; color: black;">
          Bonjour,
          <div>Pouvez-vous rajouter sur la facture le bon de commande : [Numéro PO]</div>
          <div>et l'envoyer à <a href="mailto:invoices@akuoenergy.com">invoices@akuoenergy.com</a> et moi en copie ?</div>
          Cordialement,
        </div>
        `;
        await insertTemplate(template);
      }
    };
  
    return (
      <PrimaryButton
        text="Répondre avec Demande de Facture PO"
        onClick={handleReply}
        styles={{
          root: {
            width: 220,
            height: 50,
            fontWeight: 600,
            borderRadius: theme.effects.roundedCorner2,
            boxShadow: theme.effects.elevation8,
          },
        }}
      />
    );
  };
  
  export default RequestInvoicePO;  