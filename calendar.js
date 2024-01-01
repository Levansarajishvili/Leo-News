

const currentDate = document.querySelector(".current-date"),
dayTag = document.querySelector(".days"),
prevNextIcon = document.querySelectorAll(".icons span");


let date = new Date(),
currYear = date.getFullYear(),
currMonth = date.getMonth();


const months = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი",
"აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];

const renderCalendar = () => {
    let firstDateofMonth = new Date(currYear, currMonth, 1).getDay(), //getting first day of month,
    lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(); //getting last date of month
    lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate(); //getting last date of previous month
   
    let liTag = "";

    for (let i = firstDateofMonth; i > 0; i--) {
        liTag += `<li class="inactive">${lastDateofLastMonth -i + 1}</li>`;
    }

    for (let i = 1; i <= lastDateofMonth; i++) {
        liTag += `<li>${i}</li>`;
    }

    currentDate.innerText = `${months[currMonth]} ${currYear}`;
    dayTag.innerHTML = liTag;
}

renderCalendar();


prevNextIcon.forEach(icon => {
 icon.addEventListener("click", () => { 
    
    currMonth = icon.id === "prev" ? currMonth - 1 : currMonth + 1;

    if(currMonth < 0 || currMonth > 11) {
        date = new Date(currYear, currMonth);
        currYear = date.getFullYear();
        currMonth = date.getMonth();
    }else {
        date = new Date();
    }
    renderCalendar();
 })
});