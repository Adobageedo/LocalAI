import React from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton } from '@fluentui/react';
import { theme } from '../../../../../styles';

const RequestInvoicePO: React.FC = () => {
    const { insertTemplate, currentEmail } = useOffice();
  
    const handleReply = async () => {
      if (currentEmail) {
        const template = `
          Bonjour ${currentEmail.from},
          <br/><br/>
          Pouvez-vous rajouter sur la facture le bon de commande : [Numéro de commande] 
          et l'envoyer à <a href="mailto:invoices@akuoenergy.com">invoices@akuoenergy.com</a> et moi en copie ?
          <br/><br/>
          Cordialement,
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