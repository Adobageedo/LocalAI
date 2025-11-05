import React from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton } from '@fluentui/react';
import { theme } from '../../../../../styles';

const InfoPDP: React.FC = () => {
  const { insertTemplate, currentEmail } = useOffice();

  const handleReply = async () => {
    if (currentEmail) {
      const template = `
        Bonjour ${currentEmail.from},
        <br/><br/>
        Je vous écris concernant la demande de PDP. Voici les informations demandées :
        <ul>
          <li>Produit: [Insérer le produit]</li>
          <li>Quantité: [Insérer la quantité]</li>
          <li>Détails supplémentaires: [Insérer les détails]</li>
        </ul>
        N'hésitez pas à revenir vers moi si vous avez d'autres questions.
        <br/><br/>
        Cordialement,
        [Votre Nom]
      `;
      await insertTemplate(template);
    }
  };

  return (
    <PrimaryButton
      text="Répondre avec Info PDP"
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

export default InfoPDP;
