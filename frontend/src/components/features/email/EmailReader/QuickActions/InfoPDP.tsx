import React from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton } from '@fluentui/react';
import { theme } from '../../../../../styles';

const InfoPDP: React.FC = () => {
    const { insertTemplate, currentEmail } = useOffice();
  
    const handleReply = async () => {
      if (currentEmail) {
        const template = `
          Bonjour,
          <br/>
          Dans le cadre de la préparation du plan de prévention (PDP) pour votre intervention sur le parc éolien, pourrais-tu me transmettre l'analyse de risque ainsi que le mode opératoire ?
          Nous aurions également besoin des coordonnées de vos intervenants sur site ainsi que de leurs habilitations.
          <br/>
          De plus, merci de bien vouloir remplir le tableau ci-dessous et de me le renvoyer complété :
          <br/>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
            <tr>
                <th style="width: 200px; text-align: left; padding: 5px; background-color: #f2f2f2;">Raison sociale</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">Adresse</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">Téléphone</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">Représentant légal</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">Représentant sur site</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">Téléphone</th>
                <td style="padding: 5px;"></td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 5px; background-color: #f2f2f2;">E-mail</th>
                <td style="padding: 5px;"></td>
            </tr>
            </table>
          <br/>
          Merci d'avance pour ton retour.
          <br/>
          Cordialement,
        `;
        await insertTemplate(template);
      }
    };
  
    return (
      <PrimaryButton
        text="Répondre avec Demande d'Info PDP"
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
  