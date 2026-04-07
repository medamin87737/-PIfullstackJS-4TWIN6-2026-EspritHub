"""
Test to verify that all required conversational stories are defined.
Validates: Requirements 14.1, 14.2, 14.3, 14.4
"""

import yaml
import pytest
from pathlib import Path


def load_stories():
    """Load stories from data/stories.yml"""
    stories_path = Path(__file__).parent.parent / "data" / "stories.yml"
    with open(stories_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    return data.get('stories', [])


def test_stories_file_exists():
    """Verify that stories.yml file exists"""
    stories_path = Path(__file__).parent.parent / "data" / "stories.yml"
    assert stories_path.exists(), "stories.yml file should exist"


def test_explain_activity_story_exists():
    """
    Requirement 14.1: Story for explain_activity flow must exist
    """
    stories = load_stories()
    
    # Find stories containing explain_activity intent
    explain_stories = [
        story for story in stories
        if any(step.get('intent') == 'explain_activity' for step in story.get('steps', []))
    ]
    
    assert len(explain_stories) > 0, "At least one story with explain_activity intent should exist"
    
    # Verify at least one story has the corresponding action
    has_action = any(
        any(step.get('action') == 'utter_explain_activity' for step in story.get('steps', []))
        for story in explain_stories
    )
    assert has_action, "Story with explain_activity should have utter_explain_activity action"


def test_why_recommended_story_exists():
    """
    Requirement 14.2: Story for why_recommended flow must exist
    """
    stories = load_stories()
    
    # Find stories containing why_recommended intent
    why_stories = [
        story for story in stories
        if any(step.get('intent') == 'why_recommended' for step in story.get('steps', []))
    ]
    
    assert len(why_stories) > 0, "At least one story with why_recommended intent should exist"
    
    # Verify at least one story has the corresponding action
    has_action = any(
        any(step.get('action') == 'utter_why_recommended' for step in story.get('steps', []))
        for story in why_stories
    )
    assert has_action, "Story with why_recommended should have utter_why_recommended action"


def test_skills_gained_story_exists():
    """
    Requirement 14.3: Story for skills_gained flow must exist
    """
    stories = load_stories()
    
    # Find stories containing skills_gained intent
    skills_stories = [
        story for story in stories
        if any(step.get('intent') == 'skills_gained' for step in story.get('steps', []))
    ]
    
    assert len(skills_stories) > 0, "At least one story with skills_gained intent should exist"
    
    # Verify at least one story has the corresponding action
    has_action = any(
        any(step.get('action') == 'utter_skills_gained' for step in story.get('steps', []))
        for story in skills_stories
    )
    assert has_action, "Story with skills_gained should have utter_skills_gained action"


def test_multiple_questions_story_exists():
    """
    Requirement 14.4: Stories for multiple chained questions must exist
    """
    stories = load_stories()
    
    # Find stories with multiple question intents (at least 2 different question intents)
    question_intents = {'explain_activity', 'why_recommended', 'skills_gained'}
    
    multi_question_stories = []
    for story in stories:
        intents_in_story = [
            step.get('intent') for step in story.get('steps', [])
            if step.get('intent') in question_intents
        ]
        if len(intents_in_story) >= 2:
            multi_question_stories.append(story)
    
    assert len(multi_question_stories) > 0, "At least one story with multiple chained questions should exist"


def test_each_story_has_intent_and_action():
    """
    Requirement 14.4: Each story must include intent and corresponding response
    """
    stories = load_stories()
    
    for story in stories:
        story_name = story.get('story', 'unnamed')
        steps = story.get('steps', [])
        
        # Each story should have at least one intent and one action
        has_intent = any('intent' in step for step in steps)
        has_action = any('action' in step for step in steps)
        
        assert has_intent, f"Story '{story_name}' should have at least one intent"
        assert has_action, f"Story '{story_name}' should have at least one action"


def test_direct_questions_without_greeting():
    """
    Verify that direct questions (without greeting) are supported
    """
    stories = load_stories()
    
    # Find stories that start directly with a question intent (no greet)
    question_intents = {'explain_activity', 'why_recommended', 'skills_gained'}
    
    direct_stories = []
    for story in stories:
        steps = story.get('steps', [])
        if len(steps) > 0 and steps[0].get('intent') in question_intents:
            direct_stories.append(story)
    
    assert len(direct_stories) >= 3, "Should have direct question stories for each main intent"


def test_stories_with_greeting():
    """
    Verify that conversations with greeting are supported
    """
    stories = load_stories()
    
    # Find stories that start with greet
    greeting_stories = [
        story for story in stories
        if len(story.get('steps', [])) > 0 and story['steps'][0].get('intent') == 'greet'
    ]
    
    assert len(greeting_stories) >= 3, "Should have greeting stories for each main intent"


def test_goodbye_flow_exists():
    """
    Verify that goodbye flow is included in some stories
    """
    stories = load_stories()
    
    # Find stories with goodbye intent
    goodbye_stories = [
        story for story in stories
        if any(step.get('intent') == 'goodbye' for step in story.get('steps', []))
    ]
    
    assert len(goodbye_stories) > 0, "At least one story should include goodbye intent"
    
    # Verify goodbye action exists
    has_goodbye_action = any(
        any(step.get('action') == 'utter_goodbye' for step in story.get('steps', []))
        for story in goodbye_stories
    )
    assert has_goodbye_action, "Stories with goodbye intent should have utter_goodbye action"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
