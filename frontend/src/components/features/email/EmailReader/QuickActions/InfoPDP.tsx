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
          <br/><br/>
          Dans le cadre de la préparation du plan de prévention (PDP) pour votre intervention sur le parc éolien, pourrais-tu me transmettre l'analyse de risque ainsi que le mode opératoire ?
          Nous aurions également besoin des coordonnées de vos intervenants sur site ainsi que de leurs habilitations.
          <br/><br/>
          De plus, merci de bien vouloir remplir le tableau ci-dessous et de me le renvoyer complété :
          <br/><br/>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr>
              <th>Raison sociale</th>
              <th>Adresse</th>
              <th>Téléphone</th>
              <th>Représentant légal</th>
              <th>Représentant sur site</th>
              <th>Téléphone</th>
              <th>E-mail</th>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>
          <br/><br/>
          Merci d'avance pour ton retour.
          <br/><br/>
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
  