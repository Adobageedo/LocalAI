"""
Outlook Calendar adapter for managing calendar events using Microsoft Graph API.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import datetime
import time
import functools
import requests
from typing import Dict, List, Optional, Any, Union, Callable

from backend.services.auth.microsoft_auth import get_calendar_service
from backend.core.logger import log

# Retry decorator for handling transient API errors
def retry_with_backoff(max_retries: int = 3, initial_backoff: float = 1, 
                      backoff_factor: float = 2, retryable_errors: tuple = (requests.RequestException,)):
    """
    Decorator that retries the decorated function with exponential backoff
    when specified exceptions occur.
    
    Args:
        max_retries: Maximum number of retries before giving up
        initial_backoff: Initial backoff time in seconds
        backoff_factor: Factor by which to multiply backoff after each failure
        retryable_errors: Tuple of exceptions that trigger a retry
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            retries = 0
            
            while True:
                try:
                    return func(*args, **kwargs)
                except retryable_errors as error:
                    # Only retry on certain HTTP errors (e.g., 429, 500, 503)
                    if isinstance(error, requests.RequestException):
                        # Don't retry on client errors (except rate limiting)
                        status_code = error.response.status_code if hasattr(error, 'response') and error.response else 0
                        if status_code < 500 and status_code != 429:
                            raise
                    
                    retries += 1
                    if retries > max_retries:
                        # If we've exceeded max retries, re-raise the exception
                        raise
                    
                    # Log the retry attempt
                    log.warning(
                        f"Retry {retries}/{max_retries} for {func.__name__} after error: {error}. "
                        f"Waiting {backoff} seconds..."
                    )
                    
                    # Wait with exponential backoff
                    time.sleep(backoff)
                    
                    # Increase backoff for next retry
                    backoff *= backoff_factor
        
        return wrapper
    return decorator

logger = log.bind(name="backend.core.adapters.outlook_calendar")

# Microsoft Graph API endpoints
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"


class OutlookCalendar:
    """
    Adapter for managing Outlook Calendar events using Microsoft Graph API.
    
    This class provides methods for:
    - Authenticating with Microsoft Graph API
    - Listing calendar events
    - Creating calendar events
    - Updating calendar events
    - Deleting calendar events
    - Getting event details
    - Listing available calendars
    
    All methods follow a consistent interface pattern with error handling and logging.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the OutlookCalendar adapter.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.graph_endpoint = GRAPH_API_ENDPOINT
        self.token_data = None
        self.authenticated = False
    
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def authenticate(self) -> bool:
        """
        Authenticate with Microsoft Graph API using the provided user_id.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            # Get token using the microsoft_auth module
            self.token_data = get_calendar_service(self.user_id)
            
            if not self.token_data or 'access_token' not in self.token_data:
                logger.error("Failed to obtain access token for Microsoft Graph API")
                self.authenticated = False
                return False
            
            # Test the connection by getting the primary calendar
            headers = self._get_headers()
            response = requests.get(
                f"{self.graph_endpoint}/me/calendar",
                headers=headers
            )
            response.raise_for_status()
            
            self.authenticated = True
            logger.info("Successfully authenticated with Microsoft Graph API")
            return True
            
        except requests.RequestException as error:
            logger.error(f"HTTP error during Microsoft Graph authentication: {error}")
            self.authenticated = False
            return False
            
        except Exception as error:
            logger.error(f"Error authenticating with Microsoft Graph API: {error}")
            self.authenticated = False
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Helper method to get authenticated headers for API requests.
        
        Returns:
            Dict with authorization headers
        """
        if not self.token_data or 'access_token' not in self.token_data:
            raise ValueError("Not authenticated with Microsoft Graph API")
            
        return {
            "Authorization": f"Bearer {self.token_data['access_token']}",
            "Content-Type": "application/json"
        }
        
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def list_events(self, calendar_id: str = None, max_results: int = 10, 
                    time_min: Optional[datetime.datetime] = None,
                    time_max: Optional[datetime.datetime] = None,
                    query: Optional[str] = None) -> Dict[str, Any]:
        """
        List calendar events with optional filtering.
        
        Args:
            calendar_id: ID of the calendar to list events from (default: primary calendar)
            max_results: Maximum number of events to return
            time_min: Start time for filtering events
            time_max: End time for filtering events
            query: Search term to filter events by subject or content
            
        Returns:
            Dict with list of events and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "events": []
            }
            
        try:
            # Build the calendar path - if no calendar_id is provided, use the primary calendar
            if calendar_id:
                calendar_path = f"/me/calendars/{calendar_id}"
            else:
                calendar_path = "/me/calendar"
                
            # Prepare query parameters
            params = {
                "$top": max_results,
                "$orderby": "start/dateTime"
            }
            
            # Add time filters if provided
            filter_conditions = []
            
            if time_min:
                # Format datetime to ISO 8601 string
                time_min_str = time_min.isoformat()
                filter_conditions.append(f"start/dateTime ge '{time_min_str}'")
                
            if time_max:
                # Format datetime to ISO 8601 string
                time_max_str = time_max.isoformat()
                filter_conditions.append(f"end/dateTime le '{time_max_str}'")
                
            if query:
                # Search in subject
                filter_conditions.append(f"contains(subject, '{query}')")
                
            if filter_conditions:
                params["$filter"] = " and ".join(filter_conditions)
                
            # Make the API request
            response = requests.get(
                f"{self.graph_endpoint}{calendar_path}/events",
                headers=self._get_headers(),
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            events = data.get("value", [])
            
            # Process events to a more usable format
            processed_events = []
            for event in events:
                processed_event = {
                    'id': event.get('id'),
                    'summary': event.get('subject', 'No Title'),
                    'description': event.get('bodyPreview', ''),
                    'start': event.get('start', {}).get('dateTime'),
                    'end': event.get('end', {}).get('dateTime'),
                    'location': event.get('location', {}).get('displayName', ''),
                    'creator': event.get('organizer', {}).get('emailAddress', {}),
                    'attendees': [{
                        'email': attendee.get('emailAddress', {}).get('address'),
                        'name': attendee.get('emailAddress', {}).get('name'),
                        'response_status': attendee.get('status', {}).get('response')
                    } for attendee in event.get('attendees', [])],
                    'status': event.get('showAs', ''),
                    'html_link': event.get('webLink', ''),
                    'is_all_day': event.get('isAllDay', False)
                }
                processed_events.append(processed_event)
                
            logger.info(f"Retrieved {len(processed_events)} events from calendar")
            return {
                "success": True,
                "events": processed_events
            }
            
        except requests.RequestException as error:
            logger.error(f"HTTP error retrieving calendar events: {error}")
            return {
                "success": False,
                "error": str(error),
                "events": []
            }
            
        except Exception as error:
            logger.error(f"Error retrieving calendar events: {error}")
            return {
                "success": False,
                "error": str(error),
                "events": []
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def create_event(self, calendar_id: str = None,
                     summary: str = '',
                     description: str = '',
                     location: str = '',
                     start_time: datetime.datetime = None,
                     end_time: datetime.datetime = None,
                     attendees: List[Dict[str, str]] = None,
                     timezone: str = 'UTC') -> Dict[str, Any]:
        """
        Create a new event in the specified calendar.
        
        Args:
            calendar_id: ID of the calendar to create the event in (default: primary calendar)
            summary: Title of the event
            description: Description of the event
            location: Location of the event
            start_time: Start time of the event
            end_time: End time of the event
            attendees: List of attendees as dicts with 'email' key
            timezone: Timezone for the event
            
        Returns:
            Dict with created event details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "event": None
            }
            
        # Validate required parameters
        if not start_time or not end_time:
            error_msg = "Start time and end time are required for creating an event"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "event": None
            }
            
        try:
            # Build the calendar path - if no calendar_id is provided, use the primary calendar
            if calendar_id:
                calendar_path = f"/me/calendars/{calendar_id}"
            else:
                calendar_path = "/me/calendar"
                
            # Format attendees for Microsoft Graph API
            formatted_attendees = []
            if attendees:
                for attendee in attendees:
                    if 'email' in attendee:
                        formatted_attendees.append({
                            "emailAddress": {
                                "address": attendee['email'],
                                "name": attendee.get('name', attendee['email'])
                            },
                            "type": "required"
                        })
            
            # Format start and end times with timezone
            start_time_formatted = {
                "dateTime": start_time.isoformat(),
                "timeZone": timezone
            }
            
            end_time_formatted = {
                "dateTime": end_time.isoformat(),
                "timeZone": timezone
            }
            
            # Create event payload
            event_data = {
                "subject": summary,
                "body": {
                    "contentType": "text",
                    "content": description
                },
                "start": start_time_formatted,
                "end": end_time_formatted,
                "attendees": formatted_attendees
            }
            
            # Add location if provided
            if location:
                event_data["location"] = {
                    "displayName": location
                }
                
            # Make the API request to create the event
            response = requests.post(
                f"{self.graph_endpoint}{calendar_path}/events",
                headers=self._get_headers(),
                json=event_data
            )
            response.raise_for_status()
            
            # Process the created event
            created_event = response.json()
            
            # Format the event to match our standard format
            processed_event = {
                'id': created_event.get('id'),
                'summary': created_event.get('subject', 'No Title'),
                'description': created_event.get('bodyPreview', ''),
                'start': created_event.get('start', {}).get('dateTime'),
                'end': created_event.get('end', {}).get('dateTime'),
                'location': created_event.get('location', {}).get('displayName', ''),
                'creator': created_event.get('organizer', {}).get('emailAddress', {}),
                'attendees': [{
                    'email': attendee.get('emailAddress', {}).get('address'),
                    'name': attendee.get('emailAddress', {}).get('name'),
                    'response_status': attendee.get('status', {}).get('response')
                } for attendee in created_event.get('attendees', [])],
                'status': created_event.get('showAs', ''),
                'html_link': created_event.get('webLink', ''),
                'is_all_day': created_event.get('isAllDay', False)
            }
            
            logger.info(f"Created event: {processed_event['summary']}")
            return {
                "success": True,
                "event": processed_event
            }
            
        except requests.RequestException as error:
            logger.error(f"HTTP error creating calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
        except Exception as error:
            logger.error(f"Error creating calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def update_event(self, event_id: str,
                     calendar_id: str = None,
                     summary: Optional[str] = None,
                     description: Optional[str] = None,
                     location: Optional[str] = None,
                     start_time: Optional[datetime.datetime] = None,
                     end_time: Optional[datetime.datetime] = None,
                     attendees: Optional[List[Dict[str, str]]] = None,
                     timezone: str = 'UTC') -> Dict[str, Any]:
        """
        Update an existing event in the specified calendar.
        
        Args:
            event_id: ID of the event to update (required)
            calendar_id: ID of the calendar containing the event (default: primary calendar)
            summary: New title of the event
            description: New description of the event
            location: New location of the event
            start_time: New start time of the event
            end_time: New end time of the event
            attendees: New list of attendees as dicts with 'email' key
            timezone: Timezone for the event
            
        Returns:
            Dict with updated event details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "event": None
            }
            
        try:
            # Build the calendar path - if no calendar_id is provided, use the primary calendar
            if calendar_id:
                calendar_path = f"/me/calendars/{calendar_id}"
            else:
                calendar_path = "/me/calendar"
                
            # First get the existing event
            try:
                response = requests.get(
                    f"{self.graph_endpoint}{calendar_path}/events/{event_id}",
                    headers=self._get_headers()
                )
                response.raise_for_status()
                existing_event = response.json()
            except requests.RequestException as error:
                logger.error(f"Error retrieving event {event_id}: {error}")
                return {
                    "success": False,
                    "error": f"Event not found: {str(error)}",
                    "event": None
                }
                
            # Prepare the update payload with only the fields that need to be updated
            update_data = {}
            
            # Update subject if provided
            if summary is not None:
                update_data["subject"] = summary
                
            # Update body/description if provided
            if description is not None:
                update_data["body"] = {
                    "contentType": "text",
                    "content": description
                }
                
            # Update location if provided
            if location is not None:
                update_data["location"] = {
                    "displayName": location
                }
                
            # Update start time if provided
            if start_time is not None:
                update_data["start"] = {
                    "dateTime": start_time.isoformat(),
                    "timeZone": timezone
                }
                
            # Update end time if provided
            if end_time is not None:
                update_data["end"] = {
                    "dateTime": end_time.isoformat(),
                    "timeZone": timezone
                }
                
            # Update attendees if provided
            if attendees is not None:
                formatted_attendees = []
                for attendee in attendees:
                    if 'email' in attendee:
                        formatted_attendees.append({
                            "emailAddress": {
                                "address": attendee['email'],
                                "name": attendee.get('name', attendee['email'])
                            },
                            "type": "required"
                        })
                update_data["attendees"] = formatted_attendees
                
            # Make the API request to update the event
            response = requests.patch(
                f"{self.graph_endpoint}{calendar_path}/events/{event_id}",
                headers=self._get_headers(),
                json=update_data
            )
            response.raise_for_status()
            
            # Process the updated event
            updated_event = response.json()
            
            # Format the event to match our standard format
            processed_event = {
                'id': updated_event.get('id'),
                'summary': updated_event.get('subject', 'No Title'),
                'description': updated_event.get('bodyPreview', ''),
                'start': updated_event.get('start', {}).get('dateTime'),
                'end': updated_event.get('end', {}).get('dateTime'),
                'location': updated_event.get('location', {}).get('displayName', ''),
                'creator': updated_event.get('organizer', {}).get('emailAddress', {}),
                'attendees': [{
                    'email': attendee.get('emailAddress', {}).get('address'),
                    'name': attendee.get('emailAddress', {}).get('name'),
                    'response_status': attendee.get('status', {}).get('response')
                } for attendee in updated_event.get('attendees', [])],
                'status': updated_event.get('showAs', ''),
                'html_link': updated_event.get('webLink', ''),
                'is_all_day': updated_event.get('isAllDay', False)
            }
            
            logger.info(f"Updated event: {processed_event['summary']}")
            return {
                "success": True,
                "event": processed_event
            }
            
        except requests.RequestException as error:
            logger.error(f"HTTP error updating calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
        except Exception as error:
            logger.error(f"Error updating calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def delete_event(self, event_id: str, calendar_id: str = None) -> Dict[str, Any]:
        """
        Delete an event from the specified calendar.
        
        Args:
            event_id: ID of the event to delete (required)
            calendar_id: ID of the calendar containing the event (default: primary calendar)
            
        Returns:
            Dict with success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated"
            }
            
        try:
            # Build the calendar path - if no calendar_id is provided, use the primary calendar
            if calendar_id:
                calendar_path = f"/me/calendars/{calendar_id}"
            else:
                calendar_path = "/me/calendar"
                
            # Make the API request to delete the event
            response = requests.delete(
                f"{self.graph_endpoint}{calendar_path}/events/{event_id}",
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            # For successful deletion, Microsoft Graph API returns 204 No Content
            if response.status_code == 204:
                logger.info(f"Successfully deleted event {event_id}")
                return {
                    "success": True
                }
            else:
                logger.warning(f"Unexpected response code {response.status_code} when deleting event {event_id}")
                return {
                    "success": False,
                    "error": f"Unexpected response code: {response.status_code}"
                }
                
        except requests.RequestException as error:
            logger.error(f"HTTP error deleting calendar event: {error}")
            return {
                "success": False,
                "error": str(error)
            }
            
        except Exception as error:
            logger.error(f"Error deleting calendar event: {error}")
            return {
                "success": False,
                "error": str(error)
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def get_event(self, event_id: str, calendar_id: str = None) -> Dict[str, Any]:
        """
        Get details of a specific event from the calendar.
        
        Args:
            event_id: ID of the event to retrieve (required)
            calendar_id: ID of the calendar containing the event (default: primary calendar)
            
        Returns:
            Dict with event details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "event": None
            }
            
        try:
            # Build the calendar path - if no calendar_id is provided, use the primary calendar
            if calendar_id:
                calendar_path = f"/me/calendars/{calendar_id}"
            else:
                calendar_path = "/me/calendar"
                
            # Make the API request to get the event
            response = requests.get(
                f"{self.graph_endpoint}{calendar_path}/events/{event_id}",
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            # Process the event data
            event = response.json()
            
            # Format the event to match our standard format
            processed_event = {
                'id': event.get('id'),
                'summary': event.get('subject', 'No Title'),
                'description': event.get('bodyPreview', ''),
                'start': event.get('start', {}).get('dateTime'),
                'end': event.get('end', {}).get('dateTime'),
                'location': event.get('location', {}).get('displayName', ''),
                'creator': event.get('organizer', {}).get('emailAddress', {}),
                'attendees': [{
                    'email': attendee.get('emailAddress', {}).get('address'),
                    'name': attendee.get('emailAddress', {}).get('name'),
                    'response_status': attendee.get('status', {}).get('response')
                } for attendee in event.get('attendees', [])],
                'status': event.get('showAs', ''),
                'html_link': event.get('webLink', ''),
                'is_all_day': event.get('isAllDay', False)
            }
            
            logger.info(f"Retrieved event: {processed_event['summary']}")
            return {
                "success": True,
                "event": processed_event
            }
            
        except requests.RequestException as error:
            logger.error(f"HTTP error retrieving calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
        except Exception as error:
            logger.error(f"Error retrieving calendar event: {error}")
            return {
                "success": False,
                "error": str(error),
                "event": None
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def list_calendars(self) -> Dict[str, Any]:
        """
        List all available calendars for the authenticated user.
        
        Returns:
            Dict with list of calendars and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "calendars": []
            }
            
        try:
            # Make the API request to get all calendars
            response = requests.get(
                f"{self.graph_endpoint}/me/calendars",
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            # Process the calendars data
            data = response.json()
            calendars = data.get("value", [])
            
            # Format the calendars to a more usable format
            processed_calendars = []
            for calendar in calendars:
                processed_calendar = {
                    'id': calendar.get('id'),
                    'name': calendar.get('name', 'Unnamed Calendar'),
                    'description': calendar.get('description', ''),
                    'owner': calendar.get('owner', {}).get('name', ''),
                    'is_primary': calendar.get('isDefaultCalendar', False),
                    'can_edit': calendar.get('canEdit', False),
                    'color': calendar.get('color', 'auto')
                }
                processed_calendars.append(processed_calendar)
                
            logger.info(f"Retrieved {len(processed_calendars)} calendars")
            return {
                "success": True,
                "calendars": processed_calendars
            }
            
        except requests.RequestException as error:
            logger.error(f"HTTP error retrieving calendars: {error}")
            return {
                "success": False,
                "error": str(error),
                "calendars": []
            }
            
        except Exception as error:
            logger.error(f"Error retrieving calendars: {error}")
            return {
                "success": False,
                "error": str(error),
                "calendars": []
            }


def main():
    """
    Test function for the OutlookCalendar adapter.
    
    This function tests all the methods of the OutlookCalendar adapter in sequence.
    It creates an event, lists events, gets the event details, updates the event,
    and finally deletes the event.
    """
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get user ID from environment variables
    user_id = os.getenv('OUTLOOK_USER_ID', 'default_user')
    
    print(f"\n{'=' * 50}")
    print("Testing OutlookCalendar adapter...")
    print(f"{'=' * 50}\n")
    
    # Initialize the adapter
    outlook_calendar = OutlookCalendar(user_id)
    
    # Step 1: Authenticate
    print("\n1. Authenticating with Microsoft Graph API...")
    auth_result = outlook_calendar.authenticate()
    print(f"Authentication result: {auth_result}")
    
    if not auth_result:
        print("Authentication failed. Exiting test.")
        return
    
    # Step 2: List available calendars
    print("\n2. Listing available calendars...")
    calendars_result = outlook_calendar.list_calendars()
    
    if calendars_result["success"]:
        print(f"Found {len(calendars_result['calendars'])} calendars:")
        for calendar in calendars_result["calendars"]:
            print(f"  - {calendar['name']} (ID: {calendar['id']}, Primary: {calendar['is_primary']})")
        
        # Use the primary calendar for testing
        primary_calendar = None
        for calendar in calendars_result["calendars"]:
            if calendar["is_primary"]:
                primary_calendar = calendar
                break
                
        if not primary_calendar and calendars_result["calendars"]:
            # If no primary calendar found, use the first one
            primary_calendar = calendars_result["calendars"][0]
            
        if primary_calendar:
            calendar_id = primary_calendar["id"]
            print(f"\nUsing calendar: {primary_calendar['name']} (ID: {calendar_id})")
        else:
            calendar_id = None
            print("\nNo calendars found. Using default calendar.")
    else:
        print(f"Failed to list calendars: {calendars_result.get('error')}")
        calendar_id = None
    
    # Step 3: Create a test event
    print("\n3. Creating a test event...")
    
    # Create event with current time + 1 day
    start_time = datetime.datetime.now() + datetime.timedelta(days=1)
    end_time = start_time + datetime.timedelta(hours=1)
    
    create_result = outlook_calendar.create_event(
        calendar_id=calendar_id,
        summary="Test Event from OutlookCalendar Adapter",
        description="This is a test event created by the OutlookCalendar adapter.",
        location="Virtual Meeting",
        start_time=start_time,
        end_time=end_time,
        attendees=[{"email": "test@example.com", "name": "Test User"}]
    )
    
    if create_result["success"]:
        event_id = create_result["event"]["id"]
        print(f"Created event: {create_result['event']['summary']} (ID: {event_id})")
    else:
        print(f"Failed to create event: {create_result.get('error')}")
        return
    
    # Step 4: List events
    print("\n4. Listing events...")
    list_result = outlook_calendar.list_events(
        calendar_id=calendar_id,
        max_results=5,
        time_min=datetime.datetime.now()
    )
    
    if list_result["success"]:
        print(f"Found {len(list_result['events'])} events:")
        for event in list_result["events"]:
            print(f"  - {event['summary']} (ID: {event['id']})")
    else:
        print(f"Failed to list events: {list_result.get('error')}")
    
    # Step 5: Get event details
    print("\n5. Getting event details...")
    get_result = outlook_calendar.get_event(event_id, calendar_id)
    
    if get_result["success"]:
        event = get_result["event"]
        print(f"Event details:")
        print(f"  - Summary: {event['summary']}")
        print(f"  - Description: {event['description']}")
        print(f"  - Start: {event['start']}")
        print(f"  - End: {event['end']}")
        print(f"  - Location: {event['location']}")
    else:
        print(f"Failed to get event details: {get_result.get('error')}")
    
    # Step 6: Update the event
    print("\n6. Updating the event...")
    update_result = outlook_calendar.update_event(
        event_id=event_id,
        calendar_id=calendar_id,
        summary="Updated Test Event from OutlookCalendar Adapter",
        description="This event was updated by the OutlookCalendar adapter."
    )
    
    if update_result["success"]:
        print(f"Updated event: {update_result['event']['summary']}")
    else:
        print(f"Failed to update event: {update_result.get('error')}")
    
    # Step 7: Delete the event
    print("\n7. Deleting the event...")
    delete_result = outlook_calendar.delete_event(event_id, calendar_id)
    
    if delete_result["success"]:
        print(f"Successfully deleted event with ID: {event_id}")
    else:
        print(f"Failed to delete event: {delete_result.get('error')}")
    
    print(f"\n{'=' * 50}")
    print("OutlookCalendar adapter test completed.")
    print(f"{'=' * 50}\n")


if __name__ == "__main__":
    main()
