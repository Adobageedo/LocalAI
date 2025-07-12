#!/usr/bin/env python3
"""
Google Calendar Adapter Module.

Provides functionality for managing Google Calendar events
using a provided access token.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import datetime
import time
import functools
from typing import Dict, List, Optional, Any, Union, Callable
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from backend.services.auth.google_auth import get_calendar_service

from backend.core.logger import log

# Retry decorator for handling transient API errors
def retry_with_backoff(max_retries: int = 3, initial_backoff: float = 1, 
                      backoff_factor: float = 2, retryable_errors: tuple = (HttpError,)):
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
                    if isinstance(error, HttpError):
                        # Don't retry on client errors (except rate limiting)
                        status_code = error.resp.status
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

logger = log.bind(name="backend.core.adapters.google_calendar")

class GoogleCalendar:
    """
    Class for handling Google Calendar operations using an access token.
    
    This class provides methods for:
    - Listing calendar events
    - Creating new events
    - Updating existing events
    - Deleting events
    - Getting event details
    
    It uses the Google Calendar API via an authenticated session with the provided token.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the GoogleCalendar handler with an access token.
        
        Args:
            access_token: Valid Google OAuth2 access token with calendar permissions
        """
        self.user_id = user_id
        self.calendar_service = None
        self.authenticated = False
        
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def authenticate(self) -> bool:
        """
        Authenticate with Google Calendar API using the provided access token.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            # Authenticate and build the Google Calendar service
            self.calendar_service = get_calendar_service(self.user_id)
    
            self.authenticated = True
            return True
            
        except HttpError as error:
            logger.error(f"HTTP error during Google Calendar authentication: {error}")
            self.authenticated = False
            return False
            
        except Exception as error:
            logger.error(f"Error authenticating with Google Calendar API: {error}")
            self.authenticated = False
            return False
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def list_events(self, calendar_id: str = 'primary', max_results: int = 10, 
                    time_min: Optional[datetime.datetime] = None,
                    time_max: Optional[datetime.datetime] = None,
                    query: Optional[str] = None) -> Dict[str, Any]:
        """
        List events from the specified calendar.
        
        Args:
            calendar_id: ID of the calendar to fetch events from (default: 'primary')
            max_results: Maximum number of events to return (default: 10)
            time_min: Start time for fetching events (default: now)
            time_max: End time for fetching events (default: none)
            query: Free text search term to filter events
            
        Returns:
            Dict with list of events and success status
        """
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
            return {
                "success": False,
                "error": "Not authenticated",
                "events": []
            }
            
        try:
            # Set default time_min to now if not provided
            if time_min is None:
                time_min = datetime.datetime.utcnow()
                
            # Convert datetime objects to RFC3339 format
            time_min_str = time_min.isoformat() + 'Z'  # 'Z' indicates UTC time
            time_max_str = None
            if time_max:
                time_max_str = time_max.isoformat() + 'Z'
                
            # Prepare the request parameters
            params = {
                'calendarId': calendar_id,
                'maxResults': max_results,
                'timeMin': time_min_str,
                'singleEvents': True,
                'orderBy': 'startTime'
            }
            
            # Add optional parameters if provided
            if time_max_str:
                params['timeMax'] = time_max_str
            if query:
                params['q'] = query
                
            # Execute the events list request
            events_result = self.calendar_service.events().list(**params).execute()
            events = events_result.get('items', [])
            
            # Process events to a more usable format
            processed_events = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                
                processed_event = {
                    'id': event['id'],
                    'summary': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'start': start,
                    'end': end,
                    'location': event.get('location', ''),
                    'creator': event.get('creator', {}),
                    'attendees': event.get('attendees', []),
                    'status': event.get('status', ''),
                    'html_link': event.get('htmlLink', '')
                }
                processed_events.append(processed_event)
                
            logger.info(f"Retrieved {len(processed_events)} events from calendar {calendar_id}")
            return {
                "success": True,
                "events": processed_events
            }
            
        except HttpError as error:
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
    def create_event(self, calendar_id: str = 'primary',
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
            calendar_id: ID of the calendar to create event in (default: 'primary')
            summary: Title of the event
            description: Description of the event
            location: Location of the event
            start_time: Start time of the event (required)
            end_time: End time of the event (required)
            attendees: List of attendees as dicts with 'email' key
            timezone: Timezone for the event
            
        Returns:
            Dict with created event details and success status
        """
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
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
            # Format the datetime objects for the API
            start_time_str = start_time.isoformat()
            end_time_str = end_time.isoformat()
            
            # Prepare the event data
            event = {
                'summary': summary,
                'location': location,
                'description': description,
                'start': {
                    'dateTime': start_time_str,
                    'timeZone': timezone,
                },
                'end': {
                    'dateTime': end_time_str,
                    'timeZone': timezone,
                },
            }
            
            # Add attendees if provided
            if attendees:
                event['attendees'] = attendees
                
            # Create the event
            created_event = self.calendar_service.events().insert(
                calendarId=calendar_id,
                body=event
            ).execute()
            
            logger.info(f"Event created: {created_event.get('htmlLink')}")
            
            # Process the created event to a more usable format
            processed_event = {
                'id': created_event['id'],
                'summary': created_event.get('summary', 'No Title'),
                'description': created_event.get('description', ''),
                'start': created_event['start'].get('dateTime', created_event['start'].get('date')),
                'end': created_event['end'].get('dateTime', created_event['end'].get('date')),
                'location': created_event.get('location', ''),
                'creator': created_event.get('creator', {}),
                'attendees': created_event.get('attendees', []),
                'status': created_event.get('status', ''),
                'html_link': created_event.get('htmlLink', '')
            }
            
            return {
                "success": True,
                "event": processed_event
            }
            
        except HttpError as error:
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
                     calendar_id: str = 'primary',
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
            calendar_id: ID of the calendar containing the event (default: 'primary')
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
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
            return {
                "success": False,
                "error": "Not authenticated",
                "event": None
            }
            
        try:
            # First get the existing event
            try:
                event = self.calendar_service.events().get(
                    calendarId=calendar_id,
                    eventId=event_id
                ).execute()
            except HttpError as error:
                logger.error(f"Error retrieving event {event_id}: {error}")
                return {
                    "success": False,
                    "error": f"Event not found: {str(error)}",
                    "event": None
                }
                
            # Update the event fields if provided
            if summary is not None:
                event['summary'] = summary
                
            if description is not None:
                event['description'] = description
                
            if location is not None:
                event['location'] = location
                
            # Update start time if provided
            if start_time is not None:
                start_time_str = start_time.isoformat()
                event['start'] = {
                    'dateTime': start_time_str,
                    'timeZone': timezone
                }
                
            # Update end time if provided
            if end_time is not None:
                end_time_str = end_time.isoformat()
                event['end'] = {
                    'dateTime': end_time_str,
                    'timeZone': timezone
                }
                
            # Update attendees if provided
            if attendees is not None:
                event['attendees'] = attendees
                
            # Update the event
            updated_event = self.calendar_service.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Event updated: {updated_event.get('htmlLink')}")
            
            # Process the updated event to a more usable format
            processed_event = {
                'id': updated_event['id'],
                'summary': updated_event.get('summary', 'No Title'),
                'description': updated_event.get('description', ''),
                'start': updated_event['start'].get('dateTime', updated_event['start'].get('date')),
                'end': updated_event['end'].get('dateTime', updated_event['end'].get('date')),
                'location': updated_event.get('location', ''),
                'creator': updated_event.get('creator', {}),
                'attendees': updated_event.get('attendees', []),
                'status': updated_event.get('status', ''),
                'html_link': updated_event.get('htmlLink', '')
            }
            
            return {
                "success": True,
                "event": processed_event
            }
            
        except HttpError as error:
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
    def delete_event(self, event_id: str, calendar_id: str = 'primary') -> Dict[str, Any]:
        """
        Delete an event from the specified calendar.
        
        Args:
            event_id: ID of the event to delete (required)
            calendar_id: ID of the calendar containing the event (default: 'primary')
            
        Returns:
            Dict with success status and any error messages
        """
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
            return {
                "success": False,
                "error": "Not authenticated"
            }
            
        try:
            # Delete the event
            self.calendar_service.events().delete(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            logger.info(f"Event {event_id} deleted from calendar {calendar_id}")
            return {
                "success": True
            }
            
        except HttpError as error:
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
    def get_event(self, event_id: str, calendar_id: str = 'primary') -> Dict[str, Any]:
        """
        Get detailed information about a specific event.
        
        Args:
            event_id: ID of the event to retrieve (required)
            calendar_id: ID of the calendar containing the event (default: 'primary')
            
        Returns:
            Dict with event details and success status
        """
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
            return {
                "success": False,
                "error": "Not authenticated",
                "event": None
            }
            
        try:
            # Get the event
            event = self.calendar_service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            # Process the event to a more usable format
            processed_event = {
                'id': event['id'],
                'summary': event.get('summary', 'No Title'),
                'description': event.get('description', ''),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'end': event['end'].get('dateTime', event['end'].get('date')),
                'location': event.get('location', ''),
                'creator': event.get('creator', {}),
                'organizer': event.get('organizer', {}),
                'attendees': event.get('attendees', []),
                'status': event.get('status', ''),
                'html_link': event.get('htmlLink', ''),
                'created': event.get('created', ''),
                'updated': event.get('updated', ''),
                'recurrence': event.get('recurrence', []),
                'reminders': event.get('reminders', {}),
                'conference_data': event.get('conferenceData', {})
            }
            
            logger.info(f"Retrieved event {event_id} from calendar {calendar_id}")
            return {
                "success": True,
                "event": processed_event
            }
            
        except HttpError as error:
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
        List all calendars available to the user.
        
        Returns:
            Dict with list of calendars and success status
        """
        if not self.authenticated or not self.calendar_service:
            logger.error("Not authenticated with Google Calendar API")
            return {
                "success": False,
                "error": "Not authenticated",
                "calendars": []
            }
            
        try:
            # Get the list of calendars
            calendars_result = self.calendar_service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            # Process calendars to a more usable format
            processed_calendars = []
            for calendar in calendars:
                processed_calendar = {
                    'id': calendar['id'],
                    'summary': calendar.get('summary', 'Unnamed Calendar'),
                    'description': calendar.get('description', ''),
                    'primary': calendar.get('primary', False),
                    'access_role': calendar.get('accessRole', ''),
                    'time_zone': calendar.get('timeZone', 'UTC'),
                    'background_color': calendar.get('backgroundColor', ''),
                    'foreground_color': calendar.get('foregroundColor', '')
                }
                processed_calendars.append(processed_calendar)
                
            logger.info(f"Retrieved {len(processed_calendars)} calendars")
            return {
                "success": True,
                "calendars": processed_calendars
            }
            
        except HttpError as error:
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
    Test function to demonstrate the GoogleCalendar adapter functionality.
    """
    import os
    from datetime import datetime, timedelta
    
    user_id = ""
    
    # Initialize the Google Calendar adapter
    calendar = GoogleCalendar(user_id)
    
    # Test 1: Authentication
    print("\n=== Testing Authentication ===")
    auth_result = calendar.authenticate()
    print(f"Authentication result: {auth_result}")
    
    if not auth_result:
        print("Authentication failed. Cannot proceed with further tests.")
        return
    
    # Test 2: List Calendars
    print("\n=== Testing List Calendars ===")
    calendars_result = calendar.list_calendars()
    if calendars_result["success"]:
        print(f"Found {len(calendars_result['calendars'])} calendars:")
        for cal in calendars_result["calendars"]:
            print(f"  - {cal['summary']} ({cal['id']})" + " (Primary)" if cal.get("primary") else "")
    else:
        print(f"Error listing calendars: {calendars_result['error']}")
    
    # Test 3: List Events
    print("\n=== Testing List Events ===")
    # Get events for the next 7 days
    now = datetime.utcnow()
    seven_days_later = now + timedelta(days=7)
    
    events_result = calendar.list_events(
        calendar_id="primary",
        max_results=5,
        time_min=now,
        time_max=seven_days_later
    )
    
    if events_result["success"]:
        print(f"Found {len(events_result['events'])} upcoming events:")
        for event in events_result["events"]:
            print(f"  - {event['summary']} (Start: {event['start']})")
    else:
        print(f"Error listing events: {events_result['error']}")
    
    # Test 4: Create Event
    print("\n=== Testing Create Event ===")
    # Create an event 2 hours from now, lasting 1 hour
    start_time = datetime.utcnow() + timedelta(hours=2)
    end_time = start_time + timedelta(hours=1)
    
    create_result = calendar.create_event(
        summary="Test Event from GoogleCalendar Adapter",
        description="This is a test event created by the GoogleCalendar adapter",
        location="Virtual",
        start_time=start_time,
        end_time=end_time,
        attendees=[{"email": "test@example.com"}]
    )
    
    if create_result["success"]:
        print(f"Event created successfully: {create_result['event']['summary']}")
        print(f"Event ID: {create_result['event']['id']}")
        print(f"Event Link: {create_result['event']['html_link']}")
        
        # Store the event ID for subsequent tests
        test_event_id = create_result["event"]["id"]
        
        # Test 5: Get Event
        print("\n=== Testing Get Event ===")
        get_result = calendar.get_event(test_event_id)
        
        if get_result["success"]:
            print(f"Retrieved event: {get_result['event']['summary']}")
            print(f"Description: {get_result['event']['description']}")
        else:
            print(f"Error getting event: {get_result['error']}")
        
        # Test 6: Update Event
        print("\n=== Testing Update Event ===")
        update_result = calendar.update_event(
            event_id=test_event_id,
            summary="Updated Test Event",
            description="This event was updated by the GoogleCalendar adapter"
        )
        
        if update_result["success"]:
            print(f"Event updated successfully: {update_result['event']['summary']}")
            print(f"New description: {update_result['event']['description']}")
        else:
            print(f"Error updating event: {update_result['error']}")
        
        # Test 7: Delete Event
        print("\n=== Testing Delete Event ===")
        delete_result = calendar.delete_event(test_event_id)
        
        if delete_result["success"]:
            print(f"Event deleted successfully")
        else:
            print(f"Error deleting event: {delete_result['error']}")
    else:
        print(f"Error creating event: {create_result['error']}")
    
    print("\nAll tests completed!")


if __name__ == "__main__":
    main()
