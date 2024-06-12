window.addEventListener('DOMContentLoaded', () => {
    const allHearts = document.querySelectorAll('#heart');
    
    allHearts.forEach(heart => {
      heart.addEventListener('click', likeUnlikePost);
    })

    const likeUnlikePost = () => {
      if(heart.classList.contains('like')) {
        heart.classList.add('unlike'); 
        heart.classList.remove('like'); 
        
      } else {
        heart.classList.add('like'); 
        heart.classList.remove('unlike'); 
        
      }
    }
    
}); 