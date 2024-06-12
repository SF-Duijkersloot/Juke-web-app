window.addEventListener('DOMContentLoaded', () => {
    const heart = document.getElementById('heart');
    
    const likeUnlikePost = () => {
      if(heart.classList.contains('like')) {
        heart.classList.add('unlike'); 
        heart.classList.remove('like'); 
        
      } else {
        heart.classList.add('like'); 
        heart.classList.remove('unlike'); 
        
      }
    }
    heart.addEventListener('click', likeUnlikePost);
}); 