from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


class ActionExplainActivity(Action):
    def name(self) -> Text:
        return "action_explain_activity"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Récupérer le contexte depuis metadata
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        titre = activity.get('titre', 'Activité sans titre')
        description = activity.get('description', 'Aucune description disponible')
        
        message = f"Cette activité s'intitule '{titre}'. {description}"
        dispatcher.utter_message(text=message)
        
        return [
            SlotSet("titre", titre),
            SlotSet("description", description)
        ]


class ActionWhyRecommended(Action):
    def name(self) -> Text:
        return "action_why_recommended"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        score = activity.get('score', 85)
        objectif = activity.get('objectif', 'votre développement professionnel')
        
        message = f"Cette activité vous est recommandée avec un score de {score}%. Elle correspond à vos objectifs professionnels : {objectif}."
        dispatcher.utter_message(text=message)
        
        return [
            SlotSet("score", score),
            SlotSet("objectif", objectif)
        ]


class ActionSkillsGained(Action):
    def name(self) -> Text:
        return "action_skills_gained"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        competences = activity.get('competences', [])
        competences_str = ', '.join(competences) if competences else 'Aucune compétence spécifiée'
        
        message = f"En participant à cette activité, vous développerez les compétences suivantes : {competences_str}."
        dispatcher.utter_message(text=message)
        
        return [SlotSet("competences", competences)]


class ActionAskDuration(Action):
    def name(self) -> Text:
        return "action_ask_duration"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        duration = activity.get('duration', 'non spécifiée')
        
        message = f"Cette activité dure {duration} jours."
        dispatcher.utter_message(text=message)
        
        return []


class ActionAskLocation(Action):
    def name(self) -> Text:
        return "action_ask_location"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        location = activity.get('location', 'À définir')
        
        message = f"Cette activité se déroule à : {location}"
        dispatcher.utter_message(text=message)
        
        return []


class ActionAskDate(Action):
    def name(self) -> Text:
        return "action_ask_date"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        metadata = tracker.latest_message.get('metadata', {})
        activity = metadata.get('activity', {})
        
        start_date = activity.get('start_date', 'non définie')
        end_date = activity.get('end_date', 'non définie')
        
        message = f"Cette activité commence le {start_date} et se termine le {end_date}."
        dispatcher.utter_message(text=message)
        
        return []
