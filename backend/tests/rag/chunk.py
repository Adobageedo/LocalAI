import sys
import os

# Add the parent directory to sys.path so Python can find src/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from src.services.ingestion.core.chunking import load_and_split_document, batch_load_and_split_document

TEST_DIR = "test_files"

def create_example_files():
    os.makedirs(TEST_DIR, exist_ok=True)

    txt_path = os.path.join(TEST_DIR, "example.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(
            "This is a sample text file used to test load_and_split_document.\n"
            "It contains several lines of text to ensure chunking works properly.\n" 
        )

    md_path = os.path.join(TEST_DIR, "example2.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(
            "# Example Markdown File\n\n"
            "BAIL D’HABITATION – LOFT INDUSTRIEL MEUBLÉ\n\nEntre les soussignés :\n\nLe Bailleur\nNom :\xa0Thomas GIRAUD\nAdresse :\xa015 quai de la Saône, 69009 Lyon\nTéléphone :\xa006 72 33 44 55\nEmail :\xa0t.giraud@exemple.fr\nNé le :\xa002/11/1978 à Lyon\n\nLe Locataire\nNom :\xa0Clara BENNETT\nAdresse actuelle : 28 rue de la République, 69002 Lyon\nTéléphone :\xa007 88 22 33 44\nEmail :\xa0clara.bennett@exemple.com\nNée le :\xa014/05/1992 à Lyon\n\n────────────────────────────────────────\n\nARTICLE 1 — LOGEMENT LOUE\n\nLoft “Les Ateliers”\nAdresse : 15 quai de la Saône, 69009 Lyon\n\nCaractéristiques :\n\nSurface habitable :\xa0120 m², loft ouvert, mezzanine, salle de bain avec WC, cuisine américaine\n\nBalcon : 10 m²\n\nMeubles : canapé, table, chaises, lits, rangements\n\nÉquipements : plaques induction, four, réfrigérateur, lave-linge, TV, micro-ondes\n\nChauffage central gaz et climatisation réversible\n\nFibre optique\n\nDPE fictif :\xa0Classe C – 110 kWh/m²/an\n\n────────────────────────────────────────\n\nARTICLE 2 — DESTINATION\n\nUsage :\xa0résidence principale uniquement\nSous-location interdite sans accord écrit.\n\n────────────────────────────────────────\n\nARTICLE 3 — DURÉE\n\nDurée :\xa02 ans, renouvelable tacitement.\nDébut :\xa01er octobre 2030\nFin :\xa030 septembre 2032\n\n────────────────────────────────────────\n\nARTICLE 4 — LOYER\n\nLoyer mensuel hors charges :\xa01 650 €\nPaiement : à terme échu, par virement bancaire\nIBAN :\xa0FR45 2000 3000 1122 3344 5566 778\nBIC :\xa0BNPAFRPPLYN\n\nRévision annuelle selon IRL T3 2030 = 152.50 (fictif)\n\n────────────────────────────────────────\n\nARTICLE 5 — CHARGES\n\nProvision mensuelle :\xa0180 €, incluant :\n\nEau et électricité\n\nChauffage et climatisation\n\nEntretien parties communes\n\nTaxe ordures ménagères\n\nRégularisation annuelle prévue en octobre.\n\n────────────────────────────────────────\n\nARTICLE 6 — DÉPÔT DE GARANTIE\n\nMontant :\xa01 650 €\xa0(1 mois de loyer), versé à la signature.\n\n────────────────────────────────────────\n\nARTICLE 7 — ÉTAT DES LIEUX\n\nÉtat des lieux contradictoire réalisé le\xa01er octobre 2030 à 17h00, annexé au bail.\n\n────────────────────────────────────────\n\nARTICLE 8 — OBLIGATIONS DU LOCATAIRE\n\nPayer loyers et charges aux échéances\n\nMaintenir le logement et mobilier en bon état\n\nSouscrire assurance habitation et fournir attestation annuelle\n\nRespecter tranquillité et règlement de copropriété\n\nAnimaux interdits sans accord écrit\n\n────────────────────────────────────────\n\nARTICLE 9 — OBLIGATIONS DU BAILLEUR\n\nFournir un logement meublé en bon état\n\nGarantir jouissance paisible\n\nAssurer réparations importantes (structure, plomberie, chauffage)\n\nFournir diagnostics obligatoires\n\n────────────────────────────────────────\n\nARTICLE 10 — TRAVAUX\n\nTravaux réalisés en 2030 :\n\nPeinture et réfection sol loft\n\nMise à jour électroménager\n\nEntretien chauffage et climatisation\n\nTravaux autorisés au locataire :\n\nFixation tableaux et étagères légères\n\nPetites installations décoratives\n\n────────────────────────────────────────\n\nARTICLE 11 — ANNEXES\n\nDPE (Classe C)\n\nDiagnostic électricité (septembre 2030)\n\nDiagnostic gaz (septembre 2030)\n\nNotice ALUR\n\nInventaire mobilier\n\nRèglement intérieur copropriété\n\n────────────────────────────────────────\n\nARTICLE 12 — CLAUSE RÉSOLUTOIRE\n\nRésiliation automatique pour :\n\nNon, etc.\n"
            "We want to see how the markdown loader handles this.\n" * 5
        )

    return txt_path, md_path


def test_single_document(filepath):
    print("\n=== TEST — SINGLE DOCUMENT ===")

    metadata = {
        "source": "unit-test",
        "sender": "tester@example.com",
        "subject": "Test",
        "body_text": "N/A"
    }

    chunks = load_and_split_document(filepath, metadata, chunk_size=300, chunk_overlap=50)

    print(f"Total chunks: {len(chunks)}")

    for c in chunks:
        print("\n----- Chunk -----")
        print("chunk_id:", c.metadata.get("chunk_id"))
        print("num_chunks:", c.metadata.get("num_chunks"))
        print("unique_id:", c.metadata.get("unique_id"))
        print("page_content:", c.page_content, "...")
        print("-----------------")


def test_batch_documents(filepaths):
    print("\n=== TEST — BATCH DOCUMENTS ===")

    batch_input = [
        {"tmp_path": fp, "metadata": {"source": "batch-test"}} for fp in filepaths
    ]

    chunks = batch_load_and_split_document(batch_input, chunk_size=300, chunk_overlap=50)

    print(f"Total combined chunks: {len(chunks)}")

    for c in chunks[:5]:
        print("\n----- Chunk (preview) -----")
        print("chunk_id:", c.metadata.get("chunk_id"))
        print("num_chunks:", c.metadata.get("num_chunks"))
        print("unique_id:", c.metadata.get("unique_id"))
        print("page_content:", c.page_content[:150], "...")
        print("---------------------------")


if __name__ == "__main__":
    txt_path, md_path = create_example_files()

    test_single_document(txt_path)
    test_batch_documents([txt_path, md_path])
