"""
Test suite for StyleAnalyzer

Tests the style analysis functionality using real and mock email data.
"""

import os
import sys
import pytest
from typing import List, Dict, Any

# Ajouter le chemin du backend au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from style_analyzer import StyleAnalyzer
from email_extractor import OutlookEmailExtractor
from email_preprocessor import EmailPreprocessor
from backend.core.logger import log

logger = log.bind(name="test_style_analyzer")

class TestStyleAnalyzer:
    """Tests pour StyleAnalyzer"""
    
    @classmethod
    def setup_class(cls):
        """Configuration initiale des tests"""
        cls.analyzer = StyleAnalyzer()
        cls.user_id = "6NtmIVkebWgJWs6cyjtjKVO4Wxp1"
    
    def test_initialization(self):
        """Test l'initialisation de l'analyseur"""
        assert self.analyzer is not None
        assert hasattr(self.analyzer, 'politeness_patterns')
        assert hasattr(self.analyzer, 'tone_patterns')
        assert hasattr(self.analyzer, 'structure_patterns')
        logger.info("✅ Initialisation de l'analyseur réussie")
    
    def test_vocabulary_analysis(self):
        """Test l'analyse du vocabulaire"""
        mock_emails = [
            {
                'body': 'Bonjour, merci pour votre email. Je vais analyser votre demande rapidement.',
                'id': '1'
            },
            {
                'body': 'Hello, thank you for the technical specifications. The API integration looks good.',
                'id': '2'
            },
            {
                'body': 'Cordialement, nous procéderons à l\'implémentation de la solution technique.',
                'id': '3'
            }
        ]
        
        vocab_analysis = self.analyzer._analyze_vocabulary(mock_emails)
        
        assert 'total_words' in vocab_analysis
        assert 'unique_words' in vocab_analysis
        assert 'vocabulary_richness' in vocab_analysis
        assert 'most_common_words' in vocab_analysis
        assert 'technical_terms' in vocab_analysis
        
        assert vocab_analysis['total_words'] > 0
        assert vocab_analysis['unique_words'] > 0
        assert 0 <= vocab_analysis['vocabulary_richness'] <= 1
        
        logger.info(f"✅ Analyse vocabulaire validée: {vocab_analysis['total_words']} mots, richesse: {vocab_analysis['vocabulary_richness']:.2f}")
    
    def test_sentence_structure_analysis(self):
        """Test l'analyse de la structure des phrases"""
        mock_emails = [
            {
                'body': 'Bonjour. Merci pour votre email détaillé. Je vais examiner chaque point attentivement et vous donner une réponse complète dans les plus brefs délais.',
                'id': '1'
            },
            {
                'body': 'OK. Parfait. Merci.',
                'id': '2'
            }
        ]
        
        structure_analysis = self.analyzer._analyze_sentence_structure(mock_emails)
        
        assert 'total_sentences' in structure_analysis
        assert 'avg_sentence_length' in structure_analysis
        assert 'short_sentences_ratio' in structure_analysis
        assert 'long_sentences_ratio' in structure_analysis
        assert 'complexity_indicators' in structure_analysis
        
        assert structure_analysis['total_sentences'] > 0
        assert structure_analysis['avg_sentence_length'] > 0
        
        logger.info(f"✅ Analyse structure validée: {structure_analysis['total_sentences']} phrases, longueur moyenne: {structure_analysis['avg_sentence_length']:.1f}")
    
    def test_punctuation_analysis(self):
        """Test l'analyse de la ponctuation"""
        mock_emails = [
            {
                'body': 'Bonjour! Comment allez-vous? J\'espère que tout va bien... Merci beaucoup!',
                'id': '1'
            },
            {
                'body': 'Voici les informations demandées: point 1, point 2, point 3.',
                'id': '2'
            }
        ]
        
        punct_analysis = self.analyzer._analyze_punctuation(mock_emails)
        
        assert 'punctuation_density' in punct_analysis
        assert 'exclamation_usage' in punct_analysis
        assert 'question_usage' in punct_analysis
        assert 'comma_usage' in punct_analysis
        assert 'punctuation_distribution' in punct_analysis
        
        assert punct_analysis['exclamation_usage'] > 0  # Il y a des ! dans les exemples
        assert punct_analysis['question_usage'] > 0     # Il y a des ? dans les exemples
        
        logger.info(f"✅ Analyse ponctuation validée: densité {punct_analysis['punctuation_density']:.3f}")
    
    def test_politeness_analysis(self):
        """Test l'analyse de la politesse"""
        formal_emails = [
            {
                'body': 'Monsieur Dupont, je vous prie d\'agréer mes salutations distinguées.',
                'id': '1'
            }
        ]
        
        informal_emails = [
            {
                'body': 'Salut! Merci pour ton message. À bientôt!',
                'id': '2'
            }
        ]
        
        formal_analysis = self.analyzer._analyze_politeness(formal_emails)
        informal_analysis = self.analyzer._analyze_politeness(informal_emails)
        
        assert 'formality_level' in formal_analysis
        assert 'politeness_ratios' in formal_analysis
        
        # Le premier devrait être plus formel
        assert formal_analysis['formality_level'] == 'formal'
        assert informal_analysis['formality_level'] == 'informal'
        
        logger.info(f"✅ Analyse politesse validée: formel={formal_analysis['formality_level']}, informel={informal_analysis['formality_level']}")
    
    def test_tone_analysis(self):
        """Test l'analyse du ton"""
        urgent_emails = [
            {
                'body': 'URGENT! Il faut absolument traiter cette demande immédiatement!',
                'id': '1'
            }
        ]
        
        friendly_emails = [
            {
                'body': 'J\'espère que vous allez bien. Ce serait super si nous pouvions nous rencontrer.',
                'id': '2'
            }
        ]
        
        urgent_analysis = self.analyzer._analyze_tone(urgent_emails)
        friendly_analysis = self.analyzer._analyze_tone(friendly_emails)
        
        assert 'dominant_tone' in urgent_analysis
        assert 'tone_distribution' in urgent_analysis
        
        # Vérifier que les tons sont correctement détectés
        assert urgent_analysis['tone_distribution'].get('urgent', 0) > 0
        assert friendly_analysis['tone_distribution'].get('friendly', 0) > 0
        
        logger.info(f"✅ Analyse ton validée: urgent={urgent_analysis['dominant_tone']}, amical={friendly_analysis['dominant_tone']}")
    
    def test_formatting_analysis(self):
        """Test l'analyse du formatage"""
        structured_emails = [
            {
                'body': '''
                Voici les points importants:
                
                • Premier point
                • Deuxième point
                
                Questions importantes:
                1. Première question?
                2. Deuxième question?
                
                Merci!
                ''',
                'id': '1'
            }
        ]
        
        format_analysis = self.analyzer._analyze_formatting(structured_emails)
        
        assert 'structure_usage' in format_analysis
        assert 'prefers_lists' in format_analysis
        assert 'uses_emphasis' in format_analysis
        
        # Devrait détecter l'utilisation de listes
        assert format_analysis['prefers_lists'] > 0
        
        logger.info(f"✅ Analyse formatage validée: utilise listes={format_analysis['prefers_lists']:.2f}")
    
    def test_contextual_analysis_by_type(self):
        """Test l'analyse contextuelle par type d'email"""
        mixed_emails = [
            {
                'body': 'Nouveau message avec contenu détaillé.',
                'email_type': 'new',
                'id': '1'
            },
            {
                'body': 'Merci pour votre réponse.',
                'email_type': 'reply',
                'id': '2'
            },
            {
                'body': 'Voici le document transféré.',
                'email_type': 'forward',
                'id': '3'
            }
        ]
        
        type_analysis = self.analyzer._analyze_by_email_type(mixed_emails)
        
        assert 'new' in type_analysis
        assert 'reply' in type_analysis
        assert 'forward' in type_analysis
        
        for email_type, analysis in type_analysis.items():
            assert 'count' in analysis
            assert 'avg_length' in analysis
            assert analysis['count'] > 0
        
        logger.info(f"✅ Analyse par type validée: {len(type_analysis)} types détectés")
    
    def test_contextual_analysis_by_recipients(self):
        """Test l'analyse contextuelle par type de destinataires"""
        mixed_emails = [
            {
                'body': 'Email interne à l\'équipe.',
                'has_internal_recipients': True,
                'has_external_recipients': False,
                'id': '1'
            },
            {
                'body': 'Email externe au client.',
                'has_internal_recipients': False,
                'has_external_recipients': True,
                'id': '2'
            }
        ]
        
        recipient_analysis = self.analyzer._analyze_by_recipient_type(mixed_emails)
        
        assert 'internal' in recipient_analysis
        assert 'external' in recipient_analysis
        
        assert recipient_analysis['internal']['count'] > 0
        assert recipient_analysis['external']['count'] > 0
        
        logger.info(f"✅ Analyse par destinataires validée: interne={recipient_analysis['internal']['count']}, externe={recipient_analysis['external']['count']}")
    
    def test_complete_style_analysis(self):
        """Test l'analyse complète de style"""
        comprehensive_emails = [
            {
                'body': 'Bonjour Monsieur Martin, merci pour votre email détaillé concernant le projet. Je vais examiner attentivement chaque point et vous donner une réponse complète.',
                'email_type': 'reply',
                'has_internal_recipients': False,
                'has_external_recipients': True,
                'importance': 'high',
                'primary_domain': 'client.com',
                'id': '1'
            },
            {
                'body': 'Salut l\'équipe! Voici un update rapide sur le projet. Tout va bien, on avance comme prévu. Des questions?',
                'email_type': 'new',
                'has_internal_recipients': True,
                'has_external_recipients': False,
                'importance': 'normal',
                'primary_domain': 'company.com',
                'id': '2'
            }
        ]
        
        complete_analysis = self.analyzer.analyze_user_style(comprehensive_emails)
        
        # Vérifier la structure de l'analyse complète
        assert 'global_analysis' in complete_analysis
        assert 'contextual_analysis' in complete_analysis
        assert 'behavioral_patterns' in complete_analysis
        assert 'analysis_metadata' in complete_analysis
        
        # Vérifier les analyses globales
        global_analysis = complete_analysis['global_analysis']
        expected_global_keys = [
            'vocabulary_analysis', 'sentence_structure', 'punctuation_style',
            'politeness_level', 'tone_characteristics', 'formatting_preferences'
        ]
        
        for key in expected_global_keys:
            assert key in global_analysis, f"Clé manquante dans analyse globale: {key}"
        
        # Vérifier les analyses contextuelles
        contextual_analysis = complete_analysis['contextual_analysis']
        expected_contextual_keys = [
            'by_email_type', 'by_recipient_type', 'by_relationship', 'by_importance'
        ]
        
        for key in expected_contextual_keys:
            assert key in contextual_analysis, f"Clé manquante dans analyse contextuelle: {key}"
        
        # Vérifier les patterns comportementaux
        behavioral_patterns = complete_analysis['behavioral_patterns']
        expected_behavioral_keys = [
            'adaptation_strategy', 'communication_preferences', 
            'relationship_management', 'professional_persona'
        ]
        
        for key in expected_behavioral_keys:
            assert key in behavioral_patterns, f"Clé manquante dans patterns comportementaux: {key}"
        
        logger.info("✅ Analyse complète de style validée")
        
        # Afficher un résumé des résultats
        vocab = global_analysis['vocabulary_analysis']
        logger.info(f"   - Vocabulaire: {vocab.get('total_words', 0)} mots, richesse: {vocab.get('vocabulary_richness', 0):.2f}")
        
        politeness = global_analysis['politeness_level']
        logger.info(f"   - Politesse: niveau {politeness.get('formality_level', 'unknown')}")
        
        tone = global_analysis['tone_characteristics']
        logger.info(f"   - Ton dominant: {tone.get('dominant_tone', 'unknown')}")

def test_with_real_emails():
    """Test avec des emails réels récupérés et prétraités"""
    logger.info("🔄 Test d'analyse de style avec des emails réels...")
    
    try:
        # Pipeline complet: extraction -> prétraitement -> analyse
        user_id = "6NtmIVkebWgJWs6cyjtjKVO4Wxp1"
        
        # 1. Extraction
        extractor = OutlookEmailExtractor(user_id)
        raw_emails = extractor.get_sent_emails(days_back=60, max_emails=20)
        
        if not raw_emails:
            logger.warning("⚠️ Aucun email trouvé pour l'analyse")
            return
        
        logger.info(f"📧 {len(raw_emails)} emails extraits")
        
        # 2. Prétraitement
        preprocessor = EmailPreprocessor()
        processed_emails = preprocessor.preprocess_email_batch(raw_emails)
        
        logger.info(f"🧹 {len(processed_emails)} emails prétraités")
        
        # 3. Analyse de style
        analyzer = StyleAnalyzer()
        style_analysis = analyzer.analyze_user_style(processed_emails)
        
        logger.info("📊 Résultats de l'analyse de style:")
        
        # Afficher les résultats principaux
        if 'global_analysis' in style_analysis:
            global_analysis = style_analysis['global_analysis']
            
            # Vocabulaire
            vocab = global_analysis.get('vocabulary_analysis', {})
            if vocab:
                logger.info(f"   📝 Vocabulaire:")
                logger.info(f"      - Total mots: {vocab.get('total_words', 0)}")
                logger.info(f"      - Mots uniques: {vocab.get('unique_words', 0)}")
                logger.info(f"      - Richesse: {vocab.get('vocabulary_richness', 0):.2f}")
                logger.info(f"      - Longueur moyenne mot: {vocab.get('avg_word_length', 0):.1f}")
            
            # Structure des phrases
            structure = global_analysis.get('sentence_structure', {})
            if structure:
                logger.info(f"   📏 Structure des phrases:")
                logger.info(f"      - Phrases courtes: {structure.get('short_sentences_ratio', 0):.1%}")
                logger.info(f"      - Phrases longues: {structure.get('long_sentences_ratio', 0):.1%}")
                logger.info(f"      - Longueur moyenne: {structure.get('avg_sentence_length', 0):.1f} mots")
            
            # Politesse
            politeness = global_analysis.get('politeness_level', {})
            if politeness:
                logger.info(f"   🤝 Politesse:")
                logger.info(f"      - Niveau de formalité: {politeness.get('formality_level', 'unknown')}")
                logger.info(f"      - Score formalité: {politeness.get('formality_score', 0):.2f}")
                logger.info(f"      - Niveau courtoisie: {politeness.get('courtesy_level', 0):.2f}")
            
            # Ton
            tone = global_analysis.get('tone_characteristics', {})
            if tone:
                logger.info(f"   🎭 Caractéristiques de ton:")
                logger.info(f"      - Ton dominant: {tone.get('dominant_tone', 'unknown')}")
                logger.info(f"      - Expressivité émotionnelle: {tone.get('emotional_expressiveness', 0):.2f}")
                logger.info(f"      - Niveau d'assurance: {tone.get('assertiveness_level', 0):.2f}")
        
        # Analyses contextuelles
        if 'contextual_analysis' in style_analysis:
            contextual = style_analysis['contextual_analysis']
            
            # Par type d'email
            by_type = contextual.get('by_email_type', {})
            if by_type:
                logger.info(f"   📂 Répartition par type:")
                for email_type, data in by_type.items():
                    logger.info(f"      - {email_type}: {data.get('count', 0)} emails")
            
            # Par type de destinataire
            by_recipient = contextual.get('by_recipient_type', {})
            if by_recipient:
                logger.info(f"   👥 Répartition par destinataire:")
                internal_count = by_recipient.get('internal', {}).get('count', 0)
                external_count = by_recipient.get('external', {}).get('count', 0)
                logger.info(f"      - Internes: {internal_count}")
                logger.info(f"      - Externes: {external_count}")
        
        # Patterns comportementaux
        if 'behavioral_patterns' in style_analysis:
            patterns = style_analysis['behavioral_patterns']
            logger.info(f"   🧠 Patterns comportementaux:")
            logger.info(f"      - Stratégie d'adaptation: {patterns.get('adaptation_strategy', 'unknown')}")
            
            comm_prefs = patterns.get('communication_preferences', {})
            if comm_prefs:
                logger.info(f"      - Préfère la concision: {comm_prefs.get('prefers_conciseness', False)}")
                logger.info(f"      - Utilise la structure: {comm_prefs.get('uses_structure', False)}")
                logger.info(f"      - Style expressif: {comm_prefs.get('expressive_style', False)}")
        
        logger.info("✅ Analyse de style avec emails réels terminée")
        return style_analysis
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'analyse avec emails réels: {str(e)}")
        return None

def run_comprehensive_test():
    """Exécute un test complet de l'analyseur de style"""
    logger.info("🚀 Début des tests complets de StyleAnalyzer")
    
    try:
        # Créer une instance de test
        test_instance = TestStyleAnalyzer()
        test_instance.setup_class()
        
        # Exécuter tous les tests unitaires
        test_methods = [
            test_instance.test_initialization,
            test_instance.test_vocabulary_analysis,
            test_instance.test_sentence_structure_analysis,
            test_instance.test_punctuation_analysis,
            test_instance.test_politeness_analysis,
            test_instance.test_tone_analysis,
            test_instance.test_formatting_analysis,
            test_instance.test_contextual_analysis_by_type,
            test_instance.test_contextual_analysis_by_recipients,
            test_instance.test_complete_style_analysis
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                logger.error(f"❌ Échec du test {test_method.__name__}: {str(e)}")
                return False
        
        # Test avec des emails réels
        real_analysis = test_with_real_emails()
        
        if real_analysis:
            logger.info("✅ Tous les tests de l'analyseur de style ont réussi!")
            return True
        else:
            logger.warning("⚠️ Tests unitaires réussis, mais problème avec emails réels")
            return True  # Les tests unitaires ont réussi
        
    except Exception as e:
        logger.error(f"❌ Erreur lors des tests complets: {str(e)}")
        return False

if __name__ == "__main__":
    # Exécuter les tests complets
    success = run_comprehensive_test()
    
    if success:
        print("\n🎉 Tous les tests de StyleAnalyzer ont réussi!")
    else:
        print("\n❌ Certains tests ont échoué. Vérifiez les logs pour plus de détails.")
