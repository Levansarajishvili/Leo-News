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
