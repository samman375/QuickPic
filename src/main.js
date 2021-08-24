// COMP6080 21T1 Assignment 2
// by Samuel Thorley (z5257239)

import API from './api.js';
import { fileToDataUrl } from './helpers.js';

const api = new API('http://localhost:5000');

///////////////////////
// Global Variables: //
///////////////////////

// Variables to track app state
// Used to submit forms with correct values
let registerForm = false;
let loginForm = true;

//////////////////////
// Event listeners: //
//////////////////////

// Runs login if 'Login' button is clicked
document.getElementById('loginButton').addEventListener('click', () => {
  login();
});

// Runs login or register on 'Enter' key
window.addEventListener('keypress', function (e) {
  if (e.key === 'Enter' && loginForm) {
    login();
  } else if (e.key === 'Enter' && registerForm) {
    register();
  }
});

// Sets up register if 'Register' clicked
document.getElementById('registerButton').addEventListener('click', () => {
  openRegisterForm();
});

document.getElementById('submitButton').addEventListener('click', () => {
  register();
});

// Hides error message popup when 'X' clicked
// Deletes elements from popUp so they don't show up again on next popUp
document.getElementById('closeButton').addEventListener('click', () => {
  const popUpMessage = document.getElementById('popUpMessage');
  const popUpBox = document.getElementById('popUpBox');
  if (popUpMessage.classList.contains('commentedPeople')) {
    const commentDivs = document.getElementsByClassName('comment');
    for (const commentDiv of commentDivs) {
      commentDiv.style.display = 'none';
    }
  }
  popUpClear('noCommentsMessage');
  popUpClear('likedByList');
  popUpClear('commentForm');
  popUpClear('followingList');
  popUpClear('updateForm');
  document.getElementById('popUp').style.display = 'none';
});

document.getElementById('quickpic').addEventListener('click', () => {
  returnToFeed();
})


/////////////////////
// Main functions: //
/////////////////////

// Shows popUp given message to display
// Class given defines look of popUp
// Used in all fetch functions
function showPopUp(message, messageClass) {
  document.getElementById('popUp').style.display = 'block';
  const popUpMessage = document.getElementById('popUpMessage');
  popUpMessage.innerText = message;
  popUpMessage.className = messageClass;
}

// Shows dashboard
// Loads more posts if bottom of page reached & more posts to be loaded
function showDashboard(token) {
  loginForm = false;
  registerForm = false;
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('loginBox').style.display = 'none';
  emptyProfilePage();
  document.getElementById('myHeader').style.display = 'flex';
  let startPostIndex = 0;
  loadFeed(token, startPostIndex, 10)
  startPostIndex += 10;
  window.onscroll = function () {
    if (
      window.innerHeight + window.scrollY >= document.body.scrollHeight
    ) {
      loadFeed(token, startPostIndex, 10);
      startPostIndex += 10;
    }
  };
}

// Sets up register form
// Adds register fields + hides login & register button + shows submit button
function openRegisterForm() {
  let fields = document.getElementsByClassName('register');
  for (let i = 0; i < fields.length; i++) {
    fields[i].style.display = 'block';
  }
  document.getElementById('registerButton').style.display = 'none';
  document.getElementById('loginButton').style.display = 'none';
  document.getElementById('noAccountText').style.display = 'none';
  registerForm = true;
  loginForm = false;
}

// Given user profile info displays profile page for given user
function showProfile(token, userObj) {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('profile').style.display = 'block';
  emptyProfilePage();
  const ownUsername = document.getElementById('usernameField').value;
  let ownProfile = false;
  if (userObj.username === ownUsername) {
    ownProfile = true;
  }

  showFollowButton(token, userObj.id, ownProfile);
  showUpdateInfoButtons(token, ownProfile);
  showProfileInfo(token, userObj, ownProfile);
  showProfileImages(token, userObj);
}



//////////////////////
// Fetch functions: //
//////////////////////

// Checks entered fields, sends login request if valid
function login() {
  const username = document.getElementById('usernameField').value;
  const password = document.getElementById('passwordField').value;
  const confirm = document.getElementById('confirmField').value;

  const loginDetails = {
    username: username,
    password: password,
  };

  if (password !== confirm) {
    showPopUp('Please make sure your passwords match.', 'error');
  } else {
    api.makeAPIRequest('auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginDetails),
      })
      .then((data) => {
        if (data.status === 400 || data.status === 403) {
          throw new Error('The email or password entered is invalid. Please try again.');
        } else if (data.status === 200) {
          return data.data;
        } else {
          throw new Error('Unknown error occured!');
        }
      })
      .then((data) => {
        showDashboard(data.token);
      })
      .catch((error) => {
        showPopUp(error.message, 'error');
      });
  }
}

// Checks entered fields, sends signup request if valid
function register() {
  const username = document.getElementById('usernameField').value;
  const password = document.getElementById('passwordField').value;
  const confirm = document.getElementById('confirmField').value;
  const email = document.getElementById('emailField').value;
  const name = document.getElementById('nameField').value;

  const signupDetails = {
    username: username,
    password: password,
    email: email,
    name: name,
  };

  if (password !== confirm) {
    showPopUp('Please make sure your passwords match.', 'error');
  } else {
    api.makeAPIRequest('auth/signup', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupDetails),
      })
      .then((data) => {
        if (data.status === 400) {
          throw new Error('Please enter a valid username/password.');
        } else if (data.status === 409) {
          throw new Error('Username is taken. Please choose another.');
        } else if (data.status === 200) {
          return data.data;
        } else {
          throw new Error('Unknown error occured!');
        }
      })
      .then((data) => {
        showDashboard(data.token);
      })
      .catch((error) => {
        showPopUp(error.message, 'error');
      });
  }
}

// Shows a user's feed if token is valid
// Message printed if no (more) posts to be loaded
// Returns false if no more posts after this load, else true
function loadFeed(token, startPostIndex, nPosts) {
  api.makeAPIRequest(`user/feed?p=${startPostIndex}&n=${nPosts}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
  })
  .then((data) => {
    if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 200) {
      return data.data;
    } else {
      throw new Error('Unknown error occured!');
    }
  })
  .then((data) => {
    const allPosts = document.createElement('div');
    allPosts.setAttribute('id', 'allPosts');

    const posts = data.posts;

    if (posts.length === 0 && startPostIndex === 0) {
      // User does not follow anyone
      allPosts.innerText =
        'No posts to see.\n Start following another user to see their posts.';
    } else if (posts.length === 0) {
      // User has run out of posts
      noMorePosts();
    }

    posts.map((post) => createPost(token, allPosts, post));

    if (posts.length < 10) {
      noMorePosts();
    }
    // Adds my profile button and user search field to toolbar
    createUserSearchBox(token);
    createMyProfileButton(token);
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}

// Given optional username & id returns if user is valid
function validUsername(token, id, username) {
  let valid = false;
  let url = 'user';
  if (id !== 'none' && username !== 'none') {
    url = `user?id=${id}&username=${username}`;
  } else if (id !== 'none' && username === 'none') {
    url = `user?id=${id}`;
  } else if (id === 'none' && username !== 'none') {
    url = `user?username=${username}`;
  }
  valid = api
    .makeAPIRequest(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
    })
    .then((data) => {
      if (data.status === 200) {
        return true;
      } else {
        return false;
      }
    });
  return valid;
}

// returns userData object given user id and valid username
function getUserData(token, id, username) {
  let url = 'user';
  if (id !== 'none' && username !== 'none') {
    console.log('here');
    url = `user?id=${id}&username=${username}`;
  } else if (id !== 'none' && username === 'none') {
    url = `user?id=${id}`;
  } else if (id === 'none' && username !== 'none') {
    url = `user?username=${username}`;
  }
  let userData = api.makeAPIRequest(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 404) {
      return 'Deleted Account';
    } else if (data.status === 200) {
      return data.data;
    } else {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
  return userData;
}

// Given a postId and valid token, calls fetch request
// Returns data for corresponding postId
function getPostData(token, postId) {
  let postData = api.makeAPIRequest(`post?id=${postId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 404) {
      throw new Error('Post not found.');
    } else if (data.status === 200) {
      return data.data;
    } else {
      throw new Error('Unknown error occured!');
    }
  })
  .then((data) => {
    return data;
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
  return postData;
}

// Given valid token makes fetch request to like given postId
function likePost(token, postId) {
  api.makeAPIRequest(`post/like?id=${postId}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 404) {
      throw new Error('Post not found.');
    } else if (data.status !== 200) {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}

// Given a valid token, username makes follow request
function followUser(token, username) {
  api.makeAPIRequest(`user/follow?username=${username}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 404) {
      throw new Error('No results found.');
    } else if (data.status !== 200) {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}

// Given a valid token, username makes unfollow request
function unfollowUser(token, username) {
  api.makeAPIRequest(`user/unfollow?username=${username}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status !== 200) {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}

// Given comment to post and postId makes comment request
function postComment(token, comment, postId) {
  const commentBody = {'comment': comment};
  api.makeAPIRequest(`post/comment?id=${postId}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(commentBody),
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status === 404) {
      throw new Error('Post no longer exists.');
    } else if (data.status !== 200) {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}

// Given email, name, or password updates field
function changeProfileInfo(token, email, name, password) {
  let infoBody = {};
  if (name === 'none' && password === 'none') {
    infoBody = {
      'email': email,
    };
  } else if (email === 'none' && password === 'none') {
    infoBody = {
      'name': name,
    };
  } else if (email === 'none' && name === 'none') {
    infoBody = {
      'password': password,
    };
  }
  api.makeAPIRequest(`user`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(infoBody),
  })
  .then((data) => {
    if (data.status === 400) {
      throw new Error('Error 400: Bad Request.');
    } else if (data.status === 403) {
      throw new Error(
        'There was an error authorising your account. Please refresh and login again.'
      );
    } else if (data.status !== 200) {
      throw new Error('Unknown error occured!');
    }
  })
  .catch((error) => {
    showPopUp(error.message, 'error');
  });
}



///////////////////////
// Helper functions: //
///////////////////////

// Given the allPosts div and the json object for a post
// Creates a div for the given post
// Used in loadFeed()
function createPost(token, allPosts, post) {
  const postBox = document.createElement('div');
  postBox.className = 'postBox';
  allPosts.appendChild(postBox);
  // For each post show in order: author, image, buttons, likes, description, comments, time posted
  createProfileButton(token, postBox, post.meta.author);

  const imageDiv = document.createElement('img');
  imageDiv.setAttribute('src', `data:img/png;base64,${post.thumbnail}`);
  const postTime = convertFromUTC(post.meta.published);
  imageDiv.setAttribute('alt', `${post.meta.author}'s post on ${postTime}.`);
  imageDiv.className = 'image-div';
  postBox.appendChild(imageDiv);

  const buttonsDiv = document.createElement('div');
  postBox.appendChild(buttonsDiv);
  createLikeButton(token, buttonsDiv, post);
  createCommentButton(token, buttonsDiv, post.id);

  createShowLikesButton(token, postBox, post.meta.likes);
  createPostDiv(postBox, post.meta.description_text, 'none');
  createShowCommentsButton(postBox, post.comments);
  createPostDiv(
    postBox,
    convertFromUTC(post.meta.published), 'timestampPostDiv');
  document.getElementById('posts').appendChild(postBox);
}

// Given innerText to be output, postBox to be appended to, and any additional css classes to be added,
// appends new div element to the postBox element.
// Used in createPost()
function createPostDiv(postBox, innerText, additionalClass) {
  const newDiv = document.createElement('div');
  newDiv.innerText = innerText;
  newDiv.className = 'postDiv';
  if (additionalClass !== 'none') {
    newDiv.classList.add(additionalClass);
  }
  postBox.appendChild(newDiv);
}

function createProfileButton(token, postBox, username) {
  const newDiv = document.createElement('div');
  newDiv.innerText = username;
  newDiv.className = 'postDiv authorPostDiv';
  newDiv.addEventListener('click', () => {
    getUserData(token, 'none', username).then((userObj) => {
      showProfile(token, userObj);
    });
  });
  postBox.appendChild(newDiv);
}

// Given a token, postId, and postBox to append like button to
// Creates like button
// Used in createPost()
function createLikeButton(token, postBox, post) {
  const newDiv = document.createElement('div');
  newDiv.className = 'postButtons likeButton';
  newDiv.innerText = 'Like';
  getOwnId(token).then(id => {
    if (post.meta.likes.includes(id)) {
      newDiv.innerText = 'Liked';
      newDiv.className = 'postButtons likedButton';
    }
  });
  newDiv.addEventListener('click', () => {
    likePost(token, post.id);
    newDiv.innerText = 'Liked';
    newDiv.className = 'postButtons likedButton';
  });
  postBox.appendChild(newDiv);
}

// Same as createLikeButton() but for comments
// Builds a comment form and posts comment when 'done' clicked
// Used in createPost()
function createCommentButton(token, postBox, postId) {
  const newDiv = document.createElement('div');
  newDiv.className = 'postButtons';
  newDiv.innerText = 'Comment';
  newDiv.addEventListener('click', () => {
    const commentForm = document.createElement('div');
    document.getElementById('popUpBox').appendChild(commentForm);
    const inputComment = document.createElement('textarea');
    inputComment.setAttribute('id', 'inputComment');
    inputComment.setAttribute('rows', '5');
    inputComment.setAttribute('placeholder', 'Add a comment...');
    commentForm.appendChild(inputComment);
    const doneButton = document.createElement('div');
    doneButton.setAttribute('id', 'doneButton');
    doneButton.innerText = 'Done';
    doneButton.addEventListener('click', () => {
      // Post comment + clear form
      const comment = inputComment.value;
      if (comment !== '') {
        postComment(token, comment, postId);
      }
      if (popUpBox.contains(document.getElementById('commentForm'))) {
        popUpBox.removeChild(document.getElementById('commentForm'));
      }
      document.getElementById('popUp').style.display = 'none';
    })
    commentForm.appendChild(doneButton);
    showPopUp('Comment:\n\n', 'likedPeople');
  });
  postBox.appendChild(newDiv);
}

// Similar to createPostDiv, except specialised for like.
// Message displayed changes based on num likes
// Used in createPost()
function createShowLikesButton(token, postBox, likesObject) {
  const newDiv = document.createElement('div');
  const likedIds = likesObject;
  const numLikes = likedIds.length;
  let likesMessage = `Liked by ${numLikes} people`;
  if (numLikes === 1) {
    likesMessage = `Liked by ${numLikes} person`;
  }
  newDiv.setAttribute('id', 'numLikesButton');
  newDiv.innerText = likesMessage;
  newDiv.className = 'postDiv likePostDiv';
  const likedUsersMessage = 'Likes:\n\n';
  let likedBy = '';
  if (numLikes > 0) {
    likedIds.forEach((id) => {
      validUsername(token, id, 'none').then((valid) => {
        if (valid) {
          getUserData(token, id, 'none').then((userData) => {
            likedBy += `${userData.username}\n`;
          });
        }
      });
    });
  } else {
    likedBy += 'Nobody. :(';
  }
  newDiv.addEventListener('click', () => {
    const likedByList = document.createElement('div');
    likedByList.innerText = likedBy;
    likedByList.setAttribute('id', 'likedByList');
    document.getElementById('popUpBox').appendChild(likedByList);
    showPopUp(likedUsersMessage, 'likedPeople');
  });
  postBox.appendChild(newDiv);
}

// Similar to createShowLikesButton but for comments
// Used in createPost()
function createShowCommentsButton(postBox, commentsObject) {
  const newDiv = document.createElement('div');
  const numComments = commentsObject.length;
  let commentsMessage = `${numComments} comments`;
  if (numComments === 1) {
    commentsMessage = `${numComments} comment`;
  }
  newDiv.setAttribute('id', 'numCommentsButton');
  newDiv.innerText = commentsMessage;
  newDiv.className = 'postDiv commentPostDiv';
  let listCommentsMessage = 'Comments:\n\n';
  const popUpBox = document.getElementById('popUpBox');
  newDiv.addEventListener('click', () => {
    if (numComments > 0) {
      commentsObject.forEach((comment) => {
        showComment(popUpBox, comment);
      });
    } else {
      const noCommentsMessage = document.createElement('div');
      noCommentsMessage.setAttribute('id', 'noCommentsMessage');
      noCommentsMessage.innerText = 'No comments. :(';
      popUpBox.appendChild(noCommentsMessage);
    }
    showPopUp(listCommentsMessage, 'commentedPeople');
  });
  postBox.appendChild(newDiv);
}

// Given a comment Object appends new divs to given element
// Displays comment info
function showComment(popUpText, comment) {
  const authorDiv = document.createElement('div');
  authorDiv.innerText = comment.author;
  authorDiv.setAttribute('id', 'authorDiv');
  authorDiv.className = 'comment commentAuthor';
  popUpText.appendChild(authorDiv);

  const commentDiv = document.createElement('div');
  commentDiv.innerText = comment.comment;
  commentDiv.setAttribute('id', 'commentDiv');
  commentDiv.className = 'comment commentMessage';
  popUpText.appendChild(commentDiv);

  const timeDiv = document.createElement('div');
  timeDiv.innerText = `${convertFromUTC(comment.published)}\n`;
  timeDiv.setAttribute('id', 'timeDiv');
  timeDiv.className = 'comment commentTime';
  popUpText.appendChild(timeDiv);
}

// Given a Unix Time stamp returns time and date in readable format
// Used in createPost() and createShowCommentsButton()
function convertFromUTC(UTC) {
  let date = new Date(UTC * 1000);
  let seconds = '0' + date.getSeconds();
  let minute = '0' + date.getMinutes();
  let hour = date.getHours();
  let period = 'am';
  if (hour > 12) {
    hour -= 12;
    period = 'pm';
  }
  let day = date.getDate();
  let month = date.getMonth();
  let year = date.getFullYear();
  return `${day}/${month}/${year} ${hour}:${minute.substr(-2)}:${seconds.substr(
    -2
  )} ${period}`;
}

// Shows message at bottom when end of feed reached
// Used in loadFeed()
function noMorePosts() {
  document.getElementById('noPostsLeft').style.display = 'block';
}

// Given token, userinfoObj returned from backend
// Displays info on Profile page
// Used in showProfile()
function showProfileInfo(token, userObj, ownProfile) {
  let userInfo = document.getElementById('userInfo');
  const backButton = document.getElementById('backButton');
  
  createBackArrow(backButton);

  backButton.addEventListener('click', () => {
    returnToFeed();
  })

  const nameDiv = document.createElement('div');
  nameDiv.innerText = userObj.name;
  nameDiv.className = 'profileName';
  
  const usernameDiv = document.createElement('div');
  usernameDiv.innerText = `@${userObj.username}`;
  usernameDiv.setAttribute('id', 'usernameDiv');
  usernameDiv.className = 'profileUsername';
  
  const emailDiv = document.createElement('div');
  emailDiv.innerText = `Email: ${userObj.email}`;
  emailDiv.className = 'profileEmail';
  
  const followingDiv = document.createElement('div');
  followingDiv.innerText = `${userObj.following.length} following`;
  followingDiv.className = 'profileFollowers';

  if (ownProfile) {
    // Allow list of following to be clicked
    followingDiv.className = 'profileFollowers followingListButton';
    followingDiv.addEventListener('click', () => {
      const followingList = document.createElement('div');
      followingList.setAttribute('id', 'followingList');
      document.getElementById('popUpBox').appendChild(followingList);
      getFollowingIds(token).then(ids => {
        for (const id in ids) {
          getUsername(token, id).then(username => {
            if (username !== userObj.username) {
              const newDiv = document.createElement('div');
              newDiv.innerText = username;
              newDiv.className = 'followingList';
              followingList.appendChild(newDiv);
            }
          });
        }
        if (ids.length === 0) {
          const newDiv = document.createElement('div');
            newDiv.innerText = 'Nobody :(';
            newDiv.className = 'followingList';
            followingList.appendChild(newDiv);
        }
      });
      showPopUp('Following:\n\n', 'likedPeople');
    })
  }
  
  const followersDiv = document.createElement('div');
  followersDiv.innerText = `${userObj.followed_num} followers`;
  followersDiv.className = 'profileFollowers';

  const nPostsDiv = document.createElement('div');
  nPostsDiv.innerText = `${userObj.posts.length} posts`;
  nPostsDiv.className = 'profileFollowers';

  backButton.appendChild(backArrow);
  userInfo.appendChild(nameDiv);
  userInfo.appendChild(usernameDiv);
  userInfo.appendChild(emailDiv);
  userInfo.appendChild(followingDiv);
  userInfo.appendChild(followersDiv);
  userInfo.appendChild(nPostsDiv);
}

// Given token and list of userObj returned from getUserData()
// Loops through each posts to display
function showProfileImages(token, userObj) {
  const userPostsElem = document.getElementById('userPosts');
  const posts = userObj.posts;
  if (posts.length === 0) {
    const noPosts = document.createElement('div');
    noPosts.className = 'noProfilePosts';
    noPosts.innerText = 'User has no posts. :(';
    userPostsElem.appendChild(noPosts);
  } else {
    userPostsElem.className = 'profilePostsGrid';
    posts.map(postId => {addGridPost(token, postId)});
  }
}

// Displays each given post for profile
// Used in showProfileImages()
function addGridPost(token, postId) {
  const grid = document.getElementById('userPosts');
  const newDiv = document.createElement('div');
  newDiv.className = 'profilePostImageDiv';
  const newImage = document.createElement('img');
  
  getPostData(token, postId).then((data) => {
    newImage.setAttribute('src', `data:img/png;base64,${data.thumbnail}`);
    newImage.className = 'profilePostImage';
    newImage.setAttribute('alt', `${data.meta.author}'s post.`);
    newImage.setAttribute('width', '200');
    newImage.setAttribute('height', '200');
  })
  newDiv.appendChild(newImage);
  grid.appendChild(newDiv);
}

// Creates My Profile button on toolbar when logged in
function createMyProfileButton(token) {
  const header = document.getElementById('myHeader');
  if (!header.contains(document.getElementById('myProfile'))) {
    const newButton = document.createElement('div');
    newButton.innerText = 'My Profile';
    newButton.setAttribute('id', 'myProfile');
    const myUsername = document.getElementById('usernameField').value;
    newButton.addEventListener('click', () => {
      newButton.style.display = 'none';
      getUserData(token, 'none', myUsername).then(data => {
        showProfile(token, data)
      });
    });
    header.appendChild(newButton);
  }
}

// Given a div to append to, creates back arrow button if not already created
// Used in showProfileInfo()
function createBackArrow(div) {
  if (!div.contains(document.getElementById('backArrow'))) {
    // External icon for back arrow from 'Font Awesome'
    const backArrow = document.createElement('img');
    backArrow.setAttribute('src', 'assets/arrow-left-solid.svg');
    backArrow.setAttribute('alt', 'Back to feed icon.');
    backArrow.setAttribute('id', 'backArrow');
    div.appendChild(backArrow);
  }
}

// Creates seach bar in header
// Used in loadFeed()
function createUserSearchBox(token) {
  const header = document.getElementById('myHeader');
  if (!header.contains(document.getElementById('userSearch'))) {
    const newInput = document.createElement('input');
    newInput.setAttribute('id', 'userSearch');
    newInput.setAttribute('type', 'text');
    newInput.setAttribute('placeholder', 'Search username');

    // Search icon from 'Font Awesome'
    const searchButton = document.createElement('img');
    searchButton.setAttribute('src', 'assets/white-search-solid.svg');
    searchButton.setAttribute('alt', 'Submit search icon.');
    searchButton.setAttribute('id', 'submitSearch');
    newInput.addEventListener('input', () => {
      searchButton.style.display = 'block';
      let inputWidth = newInput.style.width;
      // Fit search button on screen when resized
      if (inputWidth === '150px') {
        newInput.style.width = '120px';
        newInput.style.right = '20px';
      }
    });
    newInput.addEventListener('blur', () => {
      if (newInput.value === '') {
        searchButton.style.display = 'none';
      }
    })
    searchButton.addEventListener('click', () => {
      let username = newInput.value;
      searchUser(token, username);
    });
    window.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && newInput.value !== '') {
        searchUser(token, document.getElementById('userSearch').value);
      }
    });
    header.appendChild(newInput);
    header.appendChild(searchButton);
  }
}

// Given a valid token and a username shows Profile of user if valid
// Shows pop up with message otherwise
// Used in createUserSearchBox()
function searchUser(token, username) {
  document.getElementById('myProfile').style.display = 'block';
  validUsername(token, 'none', username).then(valid => {
    if (!valid) {
      showPopUp('No results found.', 'error');
    } else {
      getUserData(token, 'none', username).then(userObj => {
        showProfile(token, userObj);
      });
    }
  });
}

// Shows follow button on profile given boolean ownProfile
// If own profile, button does not show / existing removed
// Button becomes unfollow if already following
function showFollowButton(token, userId, ownProfile) {
  const button = document.getElementById('follow');
  if (!(button.contains(document.getElementById('followButton')) ||
    button.contains(document.getElementById('followingButton')))
    && !ownProfile
  ) {
    const newDiv = document.createElement('div');
    newDiv.innerText = 'Follow';
    newDiv.setAttribute('id', 'followButton');
    getFollowingIds(token).then(ids => {
      if (ids.includes(userId)) {
        newDiv.innerText = 'Unfollow';
        newDiv.setAttribute('id', 'followingButton');
      }
    });
    newDiv.setAttribute('id', 'followButton');
    newDiv.addEventListener('click', () => {
      let user = document.getElementById('usernameDiv').innerText;
      // Remove @ from start of username
      user = user.substring(1);
      if (newDiv.innerText === 'Follow') {
        followUser(token, user);
        newDiv.innerText = 'Unfollow';
        newDiv.setAttribute('id', 'followingButton');
      } else if (newDiv.innerText === 'Unfollow') {
        unfollowUser(token, user);
        newDiv.innerText = 'Follow';
        newDiv.setAttribute('id', 'followButton');
      }
    });
    button.appendChild(newDiv);
  } else if (!ownProfile && button.contains(document.getElementById('followButton'))) {
    button.style.display = 'block';
    let followButton = document.getElementById('followButton');
    getFollowingIds(token).then(ids => {
      if (ids.includes(userId)) {
        followButton.innerText = 'Unfollow';
        followButton.setAttribute('id', 'followingButton');
      }
    });
  } else if (!ownProfile && button.contains(document.getElementById('followingButton'))) {
    button.style.display = 'block';
    let unfollowButton = document.getElementById('followingButton');
    getFollowingIds(token).then(ids => {
      if (!ids.includes(userId)) {
        unfollowButton.innerText = 'Follow';
        unfollowButton.setAttribute('id', 'followButton');
      }
    });
  } else if (
    ownProfile && 
    (button.contains(document.getElementById('followButton')) ||
    button.contains(document.getElementById('followingButton')))
  ) {
    button.style.display = 'none';
  }
}

// Show update email/name/password 
function showUpdateInfoButtons(token, ownProfile) {
  if (ownProfile) {
    const updateInfoDiv = document.getElementById('updateInfo');
    updateInfoDiv.style.display = 'block';
    const updateEmailDiv = document.createElement('div');
    updateEmailDiv.innerText = 'Update email';
    updateEmailDiv.setAttribute('id', 'updateEmailButton');
    updateEmailDiv.className = 'updateInfoButton';
    updateEmailDiv.addEventListener('click', () => {
      updateInfoPopup(token, 'email');
    });
    const updateNameDiv = document.createElement('div');
    updateNameDiv.innerText = 'Update name';
    updateNameDiv.setAttribute('id', 'updateNameButton');
    updateNameDiv.className = 'updateInfoButton';
    updateNameDiv.addEventListener('click', () => {
      updateInfoPopup(token, 'name');
    });
    const updatePasswordDiv = document.createElement('div');
    updatePasswordDiv.innerText = 'Update password';
    updatePasswordDiv.setAttribute('id', 'updatePasswordButton');
    updatePasswordDiv.className = 'updateInfoButton';
    updatePasswordDiv.addEventListener('click', () => {
      updateInfoPopup(token, 'password');
    });
    updateInfoDiv.appendChild(updateEmailDiv);
    updateInfoDiv.appendChild(updateNameDiv);
    updateInfoDiv.appendChild(updatePasswordDiv);
  }
}

// Resets profile page
function emptyProfilePage() {
  let userInfo = document.getElementById('userInfo');
  while (userInfo.firstChild) {
    userInfo.removeChild(userInfo.firstChild);
  }
  let userPosts = document.getElementById('userPosts');
  while (userPosts.firstChild) {
    userPosts.removeChild(userPosts.firstChild);
  }
  let updateButtons = document.getElementById('updateInfo');
  while (updateButtons.firstChild) {
    updateButtons.removeChild(updateButtons.firstChild);
  }
}

// Given token, returns ids of following people
function getFollowingIds(token) {
  let ids = getUserData(token, 'none', 'none').then(user => {
    return user.following;
  });
  return ids;
}

// Given a userid, returns username of a user
function getUsername(token, userId) {
  let username = getUserData(token, userId, 'none').then (user => {
    return user.username;
  });
  return username;
}

// Given a token, returns own userId
function getOwnId(token) {
  let id = getUserData(token, 'none', 'none').then(user => {
    return user.id;
  });
  return id;
}

// Returns to feed resetting other pages
// Used when clicking back button on profile page or Quickpic icon
function returnToFeed() {
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('profile').style.display = 'none';
  emptyProfilePage();
  document.getElementById('myProfile').style.display = 'block';
  popUpClear('followingList');
  popUpClear('updateForm');
}

// Given token and a profile info field to update, creates form for the given field
function updateInfoPopup(token, field) {
  const updateForm = document.createElement('div');
  updateForm.setAttribute('id', 'updateForm');
  document.getElementById('popUpBox').appendChild(updateForm);
  const inputField = document.createElement('input');
  inputField.setAttribute('type', 'text');
  inputField.className = 'updateInfoField';
  let placeholder = '';
  if (field === 'password') {
    inputField.setAttribute('type', 'password');
    placeholder = 'Enter new password';
  } else if (field === 'name') {
    placeholder = 'Enter new name';
  } else {
    placeholder = 'Enter new email';
  }
  inputField.setAttribute('placeholder', placeholder);
  updateForm.appendChild(inputField);
  const doneButton = document.createElement('div');
  doneButton.setAttribute('id', 'doneButton');
  doneButton.innerText = 'Done';
  doneButton.addEventListener('click', () => {
    updateUserInfo(token, field, inputField);
  });
  window.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && inputField.value !== '') {
      updateUserInfo(token, field, inputField);
    }
  });
  updateForm.appendChild(doneButton);
  showPopUp(`Update ${field}:\n\n`, 'likedPeople');
}

// Given an element, clears it from popUp
function popUpClear(div) {
  if (popUpBox.contains(document.getElementById(div))) {
    popUpBox.removeChild(document.getElementById(div));
  }
}

// Given token, field to update, and the input div of pop up updates info
function updateUserInfo(token, field, inputDiv) {
  let newEmail = 'none';
  let newName = 'none';
  let newPassword = 'none';
  const newData = inputDiv.value;
  if (field === 'password') {
    newPassword = newData;
  } else if (field === 'name') {
    newName = newData;
  } else {
    newEmail = newData;
  }
  if (newData !== '') {
    changeProfileInfo(token, newEmail, newName, newPassword);
  }
  popUpClear('updateForm');
  document.getElementById('popUp').style.display = 'none';
}