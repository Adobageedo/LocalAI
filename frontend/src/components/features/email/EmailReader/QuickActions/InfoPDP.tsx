import React from 'react';
import { useOffice } from '../../../../../contexts/OfficeContext';
import { PrimaryButton } from '@fluentui/react';
import { theme } from '../../../../../styles';

const InfoPDP: React.FC = () => {
    const { insertTemplate, currentEmail } = useOffice();
  
    const handleReply = async () => {
      if (currentEmail) {
        const template = `
          <div style="font-family: Aptos, sans-serif; font-size: 14px;">
            Bonjour,
            <br> <!-- Suppression des sauts de ligne excessifs -->
            Dans le cadre de la préparation du plan de prévention (PDP) pour votre intervention sur le parc éolien, pourrais-tu me transmettre l'analyse de risque ainsi que le mode opératoire ?
            Nous aurions également besoin des coordonnées de vos intervenants sur site ainsi que de leurs habilitations.
            <br> <!-- Suppression des sauts de ligne excessifs -->
            De plus, merci de bien vouloir remplir le tableau ci-dessous et de me le renvoyer complété :
            <br><br>
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
            <br> <!-- Suppression des sauts de ligne excessifs -->
            Merci d'avance pour ton retour.
            <br> <!-- Suppression des sauts de ligne excessifs -->
            Cordialement,
            <br>[Votre Nom]
          </div>
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
  