import requests
from rss_processor import return_podcast_summary

itunes = "https://itunes.apple.com"


def search_shows(term: str, country="us", limit=10):
    """
    Search queries using Apple iTunes search, returning only importnant information

    Args: 
        term (str): search term for Apple iTunes search
        country (str): which country to search in
        limit (int): max number of shows the search query should return

    Returns:
        list[dict]: list of all show information
    """

    response = requests.get(f"{itunes}/search", params={
        "term": term, "media": "podcast", "limit": limit, "country": country
    })
    response.raise_for_status()
    apple_output = response.json().get("results", [])

    shows = []
    for output in apple_output:
        shows.append({
            "collectionId": output.get("collectionId"),
            "collectionName": output.get("collectionName"),
            "artistName": output.get("artistName"),
            "feedUrl": output.get("feedUrl"),
            "summary": return_podcast_summary(output.get("feedUrl")),
            "artworkUrl600": output.get("artworkUrl600"),
        })
    return shows

# Given an episode, returns information about the episodes of the show
def lookup_episodes(collectionId, limit=200, country="us"):
    """
    Given an episode, returns high level information about the episodes of the show

    Args:
        collectionId (int): collectionId of the show from the apple show search queries
        limit (int): max number of shows to return
        country (str): which country to search in

    Returns:
        list[dict]: list of all episode information
    """

    response = requests.get(f"{itunes}/lookup", params={
        "id": collectionId, "entity": "podcastEpisode", "limit": limit, "country": country
    })
    response.raise_for_status()
    apple_output = response.json().get("results", [])
    
    episodes = []
    for output in apple_output[1:]:
        if output.get("wrapperType") == "podcastEpisode":
            episodes.append({
                "trackId": output.get("trackId"),
                "trackName": output.get("trackName"),
                "releaseDate": output.get("releaseDate"),
                "trackViewUrl": output.get("trackViewUrl"),
            })
    return episodes