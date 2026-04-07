"""
Property-Based Tests for Rasa Training Data Completeness

**Validates: Requirements 4.4**

Property 10: Complétude des exemples d'entraînement
Pour chaque intent défini (explain_activity, why_recommended, skills_gained),
le fichier nlu.yml doit contenir au minimum 10 exemples d'entraînement en français.
"""

import pytest
import yaml
from pathlib import Path
from typing import Dict, List


def load_nlu_data() -> Dict:
    """Load and parse the nlu.yml file"""
    nlu_path = Path(__file__).parent.parent / "data" / "nlu.yml"
    with open(nlu_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def get_intent_examples(nlu_data: Dict, intent_name: str) -> List[str]:
    """Extract examples for a specific intent from NLU data"""
    examples = []
    
    if 'nlu' not in nlu_data:
        return examples
    
    for intent_block in nlu_data['nlu']:
        if intent_block.get('intent') == intent_name:
            examples_text = intent_block.get('examples', '')
            # Parse examples (they are in format "- example\n- example\n...")
            if examples_text:
                lines = examples_text.strip().split('\n')
                examples = [line.strip().lstrip('- ') for line in lines if line.strip()]
    
    return examples


class TestTrainingCompleteness:
    """
    Property 10: Complétude des exemples d'entraînement
    **Validates: Requirements 4.4**
    """
    
    REQUIRED_INTENTS = ['explain_activity', 'why_recommended', 'skills_gained']
    MINIMUM_EXAMPLES = 10
    
    @pytest.fixture(scope='class')
    def nlu_data(self):
        """Load NLU data once for all tests"""
        return load_nlu_data()
    
    def test_property_10_all_intents_have_minimum_examples(self, nlu_data):
        """
        Property 10: Complétude des exemples d'entraînement
        
        For each intent defined (explain_activity, why_recommended, skills_gained),
        the nlu.yml file must contain at least 10 training examples in French.
        
        **Validates: Requirements 4.4**
        """
        for intent_name in self.REQUIRED_INTENTS:
            examples = get_intent_examples(nlu_data, intent_name)
            
            assert len(examples) >= self.MINIMUM_EXAMPLES, (
                f"Intent '{intent_name}' has only {len(examples)} examples, "
                f"but requires at least {self.MINIMUM_EXAMPLES}"
            )
    
    def test_explain_activity_completeness(self, nlu_data):
        """Test that explain_activity intent has at least 10 examples"""
        examples = get_intent_examples(nlu_data, 'explain_activity')
        
        assert len(examples) >= self.MINIMUM_EXAMPLES, (
            f"explain_activity has {len(examples)} examples, needs {self.MINIMUM_EXAMPLES}"
        )
        
        # Verify examples are non-empty strings
        for example in examples:
            assert isinstance(example, str), "Example must be a string"
            assert len(example.strip()) > 0, "Example must not be empty"
    
    def test_why_recommended_completeness(self, nlu_data):
        """Test that why_recommended intent has at least 10 examples"""
        examples = get_intent_examples(nlu_data, 'why_recommended')
        
        assert len(examples) >= self.MINIMUM_EXAMPLES, (
            f"why_recommended has {len(examples)} examples, needs {self.MINIMUM_EXAMPLES}"
        )
        
        # Verify examples are non-empty strings
        for example in examples:
            assert isinstance(example, str), "Example must be a string"
            assert len(example.strip()) > 0, "Example must not be empty"
    
    def test_skills_gained_completeness(self, nlu_data):
        """Test that skills_gained intent has at least 10 examples"""
        examples = get_intent_examples(nlu_data, 'skills_gained')
        
        assert len(examples) >= self.MINIMUM_EXAMPLES, (
            f"skills_gained has {len(examples)} examples, needs {self.MINIMUM_EXAMPLES}"
        )
        
        # Verify examples are non-empty strings
        for example in examples:
            assert isinstance(example, str), "Example must be a string"
            assert len(example.strip()) > 0, "Example must not be empty"
    
    def test_nlu_file_structure(self, nlu_data):
        """Verify the nlu.yml file has the correct structure"""
        assert 'nlu' in nlu_data, "NLU data must contain 'nlu' key"
        assert isinstance(nlu_data['nlu'], list), "'nlu' must be a list"
        
        # Verify all required intents are present
        found_intents = set()
        for intent_block in nlu_data['nlu']:
            if 'intent' in intent_block:
                found_intents.add(intent_block['intent'])
        
        for required_intent in self.REQUIRED_INTENTS:
            assert required_intent in found_intents, (
                f"Required intent '{required_intent}' not found in nlu.yml"
            )
    
    def test_examples_are_unique(self, nlu_data):
        """Verify that examples within each intent are unique (no duplicates)"""
        for intent_name in self.REQUIRED_INTENTS:
            examples = get_intent_examples(nlu_data, intent_name)
            
            # Normalize examples for comparison (lowercase, strip whitespace)
            normalized = [ex.lower().strip() for ex in examples]
            unique_examples = set(normalized)
            
            assert len(normalized) == len(unique_examples), (
                f"Intent '{intent_name}' has duplicate examples. "
                f"Found {len(normalized)} examples but only {len(unique_examples)} unique ones."
            )
