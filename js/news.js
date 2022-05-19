var {PythonShell} = require('python-shell');
var request = require('request');
var Glide = require('@glidejs/glide');

//Global variables
var newsGlide, searchGlide;
var searchStack = [];

//Initialises search term API from config
function init() {
  //Error checking search term from configuration file
  var searchTerm;
  if(config.search_term != "" || config.search_term == undefined) {
    searchTerm = config.search_term;
  } else {
    return displayError("No search term found in configuration file. Please enter a search term and reload.");
  }
  //Get news from API related to search term
  getNews(searchTerm);
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and news API to respond
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

//Retrieve news stories related to search term
function getNews(searchTerm) {
  //Add search term to stack
  searchStack.push(searchTerm);
  //Date object representing one week ago
  let weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  //Set options of request to 10 news items from past week with safe search
  var options = {
    method: 'GET',
    url: 'https://contextualwebsearch-websearch-v1.p.rapidapi.com/api/Search/NewsSearchAPI',
    qs: {
      autoCorrect: 'false',
      pageNumber: '1',
      pageSize: '10',
      q: searchTerm,
      safeSearch: 'true',
      fromPublishedDate: weekAgo.toISOString()
    },
    headers: {
      'x-rapidapi-host': 'contextualwebsearch-websearch-v1.p.rapidapi.com',
      'x-rapidapi-key': config.news_key
    }
  };
  //Performs request to contextual web search news API
  request(options, function(err, res, data) {
    if(err) return displayError("There was an issue getting the news. Please reload and try again.");
    //Successful response
    if(res.statusCode == 200) {
      //Unhide UI
      document.getElementById('news').style.zIndex = "1";
      //Parse data and display within UI
      let news = JSON.parse(data);
      displayStories(news.value);
      displayRelated(news.relatedSearch);
    }
  });
}

//Display news stories within carousel in UI
function displayStories(stories) {
  if(stories.length > 0) {
    //At least one news story for search term
    //Create carousel track
    var track = document.createElement('div');
    track.classList.add('glide__track');
    track.setAttribute('data-glide-el', "track");
    //Create carousel slides container
    var slides = document.createElement('ul');
    slides.classList.add('glide__slides');
    track.appendChild(slides);
    //Create carousel slide for each news story
    for(var i = 0; i < stories.length; i++) {
      let slide = formatStory(stories[i]);
      slides.appendChild(slide);
    }
    //Add carousel HTML to DOM
    document.getElementById('news').appendChild(track);
    //Set up glidejs carousel
    newsGlide = new Glide('#news', {
      type: 'carousel',
      startAt: 0,
      perView: 1,
      focusAt: 'center',
      autoplay: 15000,
      hoverpause: false,
      animationDuration: 750,
      animationTimingFunc: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
    });
    newsGlide.mount();
  } else {
    //No stories for search term
    return displayError("No news stories found within the past week for the given search term. Enter a new search term and try again.");
  }
}

//Format HTML of news story
function formatStory(details) {
  //Create story container element
  let story = document.createElement('div');
  story.classList.add('story');
  story.classList.add('glide__slide');

  //Create publishing details element
  let published = document.createElement('p');
  published.classList.add('published');
  //Format date story was published
  let pubDate = formatDate(details.datePublished);
  //Get publisher of story
  let publisher = details.provider.name;
  //Add publishing details
  let pubStr = pubDate + " from " + publisher;
  published.innerHTML = pubStr;
  //Add publishing details to story container
  story.appendChild(published);

  //Create story head container element
  let head = document.createElement('div');
  head.classList.add('story-head');
  //Create thumbnail image element
  let thumbnail = document.createElement('img');
  thumbnail.classList.add('thumbnail');
  //Decide source of thumbnail
  if(details.image.thumbnail == "") {
    //No image source supplied with story, use random image
    thumbnail.setAttribute('src', "https://picsum.photos/100");
  } else {
    //Use image source supplied with story
    thumbnail.setAttribute('src', details.image.thumbnail);
  }
  thumbnail.setAttribute('alt', "thumbnail");
  //Add thumbnail to story head container
  head.appendChild(thumbnail);
  //Create headline image element
  let headline = document.createElement('h1');
  headline.classList.add('headline');
  //Remove any HTML tags from headline and add to headline
  let hlStr = details.title.replace(/<(.|\n)*?>/g, '');
  headline.innerHTML = hlStr;
  //Add headline to story head container
  head.appendChild(headline);
  //Add story head container to story container
  story.appendChild(head);

  //Create description element
  let description = document.createElement('p');
  description.classList.add('description');
  //Remove HTML tags from story body
  let dscStr = details.body.replace(/<(.|\n)*?>/g, '');
  //Crop text to last finished sentence and add to description
  let sentenceEnd = dscStr.lastIndexOf(".");
  if(sentenceEnd != -1) {
    //Prevent out of bounds exception if body finishes with
    if(sentenceEnd != dscStr.length) {
      sentenceEnd++;
    }
    dscStr = dscStr.replace(dscStr.substring(sentenceEnd, dscStr.length), "");
  }
  description.innerHTML = dscStr;
  //Add description to story container
  story.appendChild(description);

  return story;
}

//Format date into simple format
function formatDate(dateStr) {
  //Array of month formats
  var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  //Get date information from date object
  var date = new Date(dateStr);
  let day = date.getDate();
  let month = months[date.getMonth()];
  //Format date into string
  return day + " " + month;
}

//Display related searches within carousel in UI
function displayRelated(relatedSearches) {
  if(relatedSearches.length > 0) {
    //At least one related search term
    //Create carousel track
    var track = document.createElement('div');
    track.classList.add('glide__track');
    track.setAttribute('data-glide-el', "track");
    //Create carousel slides container
    var slides = document.createElement('ul');
    slides.classList.add('glide__slides');
    track.appendChild(slides);
    //Create carousel slide for each related search
    for(var i = 0; i < relatedSearches.length; i++) {
      let slide = document.createElement('li');
      slide.classList.add('search');
      slide.classList.add('glide__slide');
      //Remove HTML tags from related search and add to slide
      let rsStr = relatedSearches[i].replace(/<(.|\n)*?>/g, '');
      slide.innerHTML = rsStr;
      slides.appendChild(slide);
    }
    //Add carousel HTML to DOM
    document.getElementById('searches').appendChild(track);
    //Set up glidejs carousel
    searchGlide = new Glide('#searches', {
      type: 'carousel',
      startAt: 0,
      perView: 3,
      focusAt: 'center',
      gap: '15',
      autoplay: 7500,
      hoverpause: false,
      animationDuration: 750,
      animationTimingFunc: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      peek: 50
    });
    searchGlide.mount();
  } else {
    //No related search terms
    hideRelatedSearches(false);
  }
}

//Hide related searches from UI and expand news stories
function hideRelatedSearches() {
  //Pause autoplay of news stories
  newsGlide.pause();
  //Hide related searches container
  document.getElementById('searches').style.height = "0%";
  //Enlarge news container to take up full screen
  document.getElementById('news').style.height= "90%";
  //Enlarge description within news container to fill space
  var descriptions = document.getElementsByClassName('description');
  for(var i = 0; i < descriptions.length; i++) {
    descriptions[i].style.height = "auto";
  }
  //Space elements within news container to fill space
  var stories = document.getElementsByClassName('story');
  for(var i = 0; i < stories.length; i++) {
    stories[i].style.justifyContent = "center";
  }
}

//Unhide related searches from UI and shrink news stories
function showRelatedSearches() {
  //Resume autoplay of news stories
  newsGlide.play();
  //Show related searches container
  document.getElementById('searches').style.height = "25%";
  //Shrink news container to original size
  document.getElementById('news').style.height= "65%";
  //Shrink description within news container to original size
  var descriptions = document.getElementsByClassName('description');
  for(var i = 0; i < descriptions.length; i++) {
    descriptions[i].style.height = "50%";
  }
  //Space elements within news container to conserve space
  var stories = document.getElementsByClassName('story');
  for(var i = 0; i < stories.length; i++) {
    stories[i].style.justifyContent = "start";
  }
}

//Get news stories for selected related search term
function getRelatedNews() {
  showRelatedSearches();
  //Get search term from active/selected slide in carousel
  let active = document.getElementsByClassName('search glide__slide--active')[0];
  if(active != undefined && active != "") {
    var searchTerm = active.innerHTML;
    //Clean UI and search term
    cleanAndSearch(searchTerm);
  }
}

//Get news stories for previously searched term
function getPreviousNews() {
  if(searchStack.length > 1) {
    //Previous search term(s) exists, clear current
    searchStack.pop();
    //Set search term to most recent previous search term
    let searchTerm = searchStack.pop();
    //Clean UI and search term
    cleanAndSearch(searchTerm);
  } else {
    //No previous search terms
    displayError("No other previous searches exist. Try a related search instead.");
  }
}

//Clean UI and request related search term from API
function cleanAndSearch(searchTerm) {
  //Remove and hide news carousel from UI
  newsGlide.destroy();
  let news = document.getElementById('news');
  news.style.zIndex = "-1";
  news.innerHTML = "";
  let searches = document.getElementById('searches');
  if(searches.innerHTML != "") {
    //Remove related search carousel from UI
    searchGlide.destroy();
  }
  searches.innerHTML = "";
  //Get news from API related to search term
  getNews(searchTerm);
}

//Display error message within UI
function displayError(err) {
  //Get error div
  let errDiv = document.getElementById('error');
  //Show error message in div
  errDiv.classList.add('transition');
  errDiv.innerHTML = err;
  //Transition-out after 5 seconds
  setTimeout(function() {errDiv.classList.remove('transition');}, 5000);
}

//Display gesture within UI
function displayGesture(gesture) {
  //Get gesture div
  let gesDiv = document.getElementById('gesture');
  //Show gesture message in div
  gesDiv.classList.add('transition');
  gesDiv.innerHTML = gesture;
  //Transition-out after 5 seconds
  setTimeout(function() {gesDiv.classList.remove('transition');}, 2000);
}

//Use output from gesture sensor python script as control
let pyshell = new PythonShell('py/gesture_print.py');
pyshell.on('message', function(gesture) {
  displayGesture(gesture);
  switch(gesture) {
    case "Up":
      //Show related search term carousel
      showRelatedSearches();
      break;
    case "Down":
      //Hide related search term carousel
      hideRelatedSearches();
      break;
    case "Left":
      //Navigate to previous news story carousel slide
      newsGlide.go("<");
      break;
    case "Right":
      //Navigate to next news story carousel slide
      newsGlide.go(">");
      break;
    case "Clockwise":
      //Navigate to next search term carousel slide
      searchGlide.go(">");
      break;
    case "Anti-clockwise":
      //Navigate to previous search term carousel slide
      searchGlide.go("<");
      break;
    case "Forward":
      //Get news for currently selected related search term
      getRelatedNews();
      break;
    case "Backward":
      //Get previously searched term from the search stack
      getPreviousNews();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
