

const questions = document.querySelectorAll(".question");

questions.forEach(function (question) {
    const btn = question.querySelector(".question-btn");
    btn.addEventListener('click', function(){

        questions.forEach(function(item) {
         if (item !== question) {
            item.classList.remove("show-text");
         }
        });

        question.classList.toggle("show-text");
    });
});


function mySearchFunct() {
    let searCh = document.getElementById("searchFoor");
    if (searCh.style.display === "none") {
        searCh.style.display = "block";
    } else {
        searCh.style.display = "none";
    }
  }

  function mobSearchFunct() {
    let mobsearCh = document.getElementById("mobSearchFoor");
    if (mobsearCh.style.display === "none") {
        mobsearCh.style.display = "block";
    } else {
        mobsearCh.style.display = "none";
    }
  }


  function mobMenuFunct() {
    let mobMenu = document.getElementById("mobileMenu");
    if (mobMenu.style.display === "none") {
        mobMenu.style.display = "block";
    } else {
        mobMenu.style.display = "none";
    }
  }