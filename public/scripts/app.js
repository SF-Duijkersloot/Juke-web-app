// window.addEventListener('DOMContentLoaded', () => {
//     const allHearts = document.querySelectorAll('#heart');
    
//     allHearts.forEach(heart => {
//       heart.addEventListener('click', likeUnlikePost);
//     })

//     const likeUnlikePost = () => {
//       if(heart.classList.contains('like')) {
//         heart.classList.add('unlike'); 
//         heart.classList.remove('like'); 
        
//       } else {
//         heart.classList.add('like'); 
//         heart.classList.remove('unlike'); 
        
//       }
//     }
    
// }); 

document.addEventListener('DOMContentLoaded', () => {
  const allHearts = document.querySelectorAll('#heart');

  const likeUnlikePost = (heart) => {
      const trackId = heart.dataset.trackId;
      const trackName = heart.dataset.trackName;
      const trackArtists = heart.dataset.trackArtists.split(',');
      const trackImages = heart.dataset.trackImages.split(',');
      const isLiked = heart.classList.contains('like');
      const action = isLiked ? 'unlike' : 'like';
      const url = `/${action}`;

      const bodyData = { track_id: trackId };

      if (!isLiked) {
          bodyData.track_name = trackName;
          bodyData.track_artists = trackArtists;
          bodyData.track_images = trackImages;
      }

      fetch(url, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyData),
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === 'success') {
              heart.classList.toggle('like', !isLiked);
              heart.classList.toggle('unlike', isLiked);

              // Verwijder de huidige LI van de lijst na een korte vertraging
              setTimeout(() => {
                  const listItem = heart.closest('li');
                  listItem.remove();
              }, 2200); // Pas de vertraging aan op basis van je animatieduur
              
          } else {
              console.error('Error:', data.message);
          }
      })
      .catch(error => {
          console.error('Error:', error);
      });
  };

  allHearts.forEach(heart => {
      heart.addEventListener('click', () => {
          likeUnlikePost(heart);
      });
  });
});