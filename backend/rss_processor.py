import feedparser

def return_episode_items(feed_url):
    """
    Given a feed url from the Apple iTunes search, return episode information with audio url for processing

    Args:
        feed_url (str): feed url from apple podcast search

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
            "summary": e.get("summary"),
            "audioUrl": audio,
            "link": e.get("link"),
        })
    return eps

def return_podcast_summary(feed_url: str):
    """
    Given a feed url from the Apple iTunes search, return the podcast summary

    Args:
        feed_url (str): feed url from apple podcast search

    Returns:
        str: the summary of the podcast
    """
    feed = feedparser.parse(feed_url)

    if feed.feed.get('summary') is None or feed.feed.get('summary') == ' ':
        return feed.feed.get('summary')
    else:
        return feed.feed.get('subtitle')