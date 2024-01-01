let lang = 1;

const changeDiv = ()=>{
    if(lang===1){
        document.getElementById("lang-btn").innerHTML = "Eng";
        lang= 2;
    }else{
        document.getElementById("lang-btn").innerHTML = "ქარ"; 
        lang = 1;       
    } 
};


const accessBtn = document.querySelector(".access-Btn");
const access = document.querySelector(".access-overlay");
const closeBtn = document.querySelector(".close-btn");

console.log(closeBtn);

accessBtn.addEventListener("click", function () {
    access.classList.remove("hidden")
});

closeBtn.addEventListener("click", function () {
    access.classList.add("hidden");
});








