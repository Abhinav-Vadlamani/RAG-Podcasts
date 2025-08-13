import requests

itunes = "https://itunes.apple.com"


# Search queries using Apple iTunes Search, returning only important information
def search_shows(term: str, country="us", limit=10):
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
            "artworkUrl600": output.get("artworkUrl600"),
        })
    return shows

# Given an episode, returns information about the episodes of the show
def lookup_episodes(collectionId, limit=200, country="us"):
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