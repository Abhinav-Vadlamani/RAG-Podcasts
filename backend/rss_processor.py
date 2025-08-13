import feedparser

def return_episode_items(feed_url):
    """
    Given a feed url from the Apple iTunes search, return episode information with audio url for processing

    Args:
        feed_url (str): feed url from apple episode search

    Returns:
        list[dict]: list of all episode information
    """
    feed = feedparser.parse(feed_url)

    eps = []
    for e in feed.entries:
        id = getattr(e, "id", None) or getattr(e, "guid", None) or e.get("link")
        audio = None
        if "enclosures" in e and e.enclosures:
            audio = e.enclosures[0].get("href")
        
        eps.append({
            "id": id,
            "title": e.get("title"),
            "published": e.get("published"),
            "audioUrl": audio,
            "link": e.get("link"),
        })
    return eps