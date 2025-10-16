// Navigation Active State on Scroll
const sections = document.querySelectorAll(".section");
const navLinks = document.querySelectorAll(".nav-link");

const observerOptions = {
  root: null,
  rootMargin: "-50% 0px -50% 0px",
  threshold: 0,
};

const observerCallback = (entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute("id");

      // Remove active class from all nav links
      navLinks.forEach((link) => {
        link.classList.remove("active");
      });

      // Add active class to corresponding nav link
      const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
      if (activeLink) {
        activeLink.classList.add("active");
      }
    }
  });
};

const observer = new IntersectionObserver(observerCallback, observerOptions);

sections.forEach((section) => {
  observer.observe(section);
});

// Smooth Scroll for Navigation Links
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = link.getAttribute("href");
    const targetSection = document.querySelector(targetId);

    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Mouse Move Parallax Effect (subtle)
let mouseX = 0;
let mouseY = 0;
let currentX = 0;
let currentY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX - window.innerWidth / 2) / 50;
  mouseY = (e.clientY - window.innerHeight / 2) / 50;
});

function animate() {
  currentX += (mouseX - currentX) * 0.1;
  currentY += (mouseY - currentY) * 0.1;

  const sidebar = document.querySelector(".sidebar-content");
  if (sidebar) {
    sidebar.style.transform = `translate(${currentX}px, ${currentY}px)`;
  }

  requestAnimationFrame(animate);
}

animate();

// Add hover effect to project and experience items
const items = document.querySelectorAll(".experience-item, .project-item");

items.forEach((item) => {
  item.addEventListener("mouseenter", function () {
    this.style.transform = "translateY(-2px)";
  });

  item.addEventListener("mouseleave", function () {
    this.style.transform = "translateY(0)";
  });
});

// Cursor Spotlight Effect
const createSpotlight = () => {
  const spotlight = document.createElement("div");
  spotlight.classList.add("spotlight");
  document.body.appendChild(spotlight);

  document.addEventListener("mousemove", (e) => {
    spotlight.style.background = `radial-gradient(600px at ${e.clientX}px ${e.clientY}px, rgba(100, 255, 218, 0.05), transparent 80%)`;
  });
};

// Add spotlight effect
const spotlightStyle = document.createElement("style");
spotlightStyle.textContent = `
    .spotlight {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        transition: background 0.1s ease;
    }
`;
document.head.appendChild(spotlightStyle);
createSpotlight();

// Add scroll reveal animation
const revealElements = document.querySelectorAll(".section-content > *");

const revealOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -100px 0px",
};

const revealCallback = (entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
};

const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

revealElements.forEach((element) => {
  element.style.opacity = "0";
  element.style.transform = "translateY(20px)";
  element.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  revealObserver.observe(element);
});

// Add typing effect to tagline (optional)
const tagline = document.querySelector(".tagline");
if (tagline) {
  const text = tagline.textContent;
  tagline.textContent = "";
  let i = 0;

  const typeWriter = () => {
    if (i < text.length) {
      tagline.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 50);
    }
  };

  // Start typing after a short delay
  setTimeout(typeWriter, 500);
}

// Add scroll progress indicator
const createScrollProgress = () => {
  const progress = document.createElement("div");
  progress.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--green), var(--light-slate));
        width: 0%;
        z-index: 1000;
        transition: width 0.1s ease;
    `;
  document.body.appendChild(progress);

  window.addEventListener("scroll", () => {
    const windowHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrolled = (window.scrollY / windowHeight) * 100;
    progress.style.width = scrolled + "%";
  });
};

createScrollProgress();

console.log("Portfolio loaded successfully! 🚀");
