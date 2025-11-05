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
        Je vous contacte pour demander la facture associée à l'ordre d'achat (PO). 
        <br/><br/>
        Veuillez trouver ci-dessous les informations de la commande :
        <ul>
          <li>Numéro de commande: [Insérer le numéro de commande]</li>
          <li>Montant total: [Insérer le montant total]</li>
        </ul>
        Merci de bien vouloir m'envoyer la facture dans les plus brefs délais.
        <br/><br/>
        Cordialement,
        [Votre Nom]
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
