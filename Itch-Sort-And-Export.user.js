// ==UserScript==
// @name          Itch-Sort-And-Export
// @description   Quickly sort and export Itch.io game listings.
// @namespace     https://github.com/6uhrmittag
// @version       0.2.1
// @author        6uhrmittag
// @match         https://itch.io/*
// @grant         none
// @homepageURL   https://github.com/6uhrmittag/Itch-Sort-And-Export
// @supportURL    https://github.com/6uhrmittag/Itch-Sort-And-Export/issues
// @updateURL     https://github.com/6uhrmittag/Itch-Sort-And-Export/raw/main/Itch-Sort-And-Export.meta.js
// @downloadURL   https://github.com/6uhrmittag/Itch-Sort-And-Export/raw/main/Itch-Sort-And-Export.user.js
// ==/UserScript==

(function () {
    'use strict';

    // Constants for calculating and display estimated time
    const totalGames = getTotalGames();
    const gamesPerBatch = 18; // Adjust based on observation
    const loadTimePerBatch = 1; // Adjust based on observation
    const totalBatches = Math.ceil(totalGames / gamesPerBatch);
    const estimatedMinutes = (totalBatches * loadTimePerBatch) / 60;
    const estimatedSeconds = totalBatches * loadTimePerBatch; // Estimated total time in seconds

    // Function to extract total number of games from the page
    function getTotalGames() {
        const gameCountElement = document.querySelector('.game_count'); // Attempt to select the .game_count element
        if (gameCountElement) {
            const gameCountText = gameCountElement.innerText; // e.g., "(13,377 results)"
            const totalGames = parseInt(gameCountText.replace(/\D/g, '')); // Remove all non-digit characters and parse
            return totalGames || 0; // Return totalGames, or 0 if totalGames is NaN or undefined
        } else {
            return 0; // Return 0 if .game_count element doesn't exist
        }
    }

    // Function to scroll to the bottom of the page to load more games
    function loadMoreGames() {
        window.scrollTo(0, document.body.scrollHeight);
    }

    // Function to check if all games are loaded
    function allGamesLoaded() {
        const loadedGames = document.querySelectorAll('.game_cell').length;
        return loadedGames >= getTotalGames();
    }

    // Function to periodically check and load more games until all are loaded
    function continuouslyLoadGames(callback) {
        let startTime = Date.now(); // Capture start time
        let lastLoadedGames = 0;
        let sameCount = 0; // To track the number of consecutive checks with no new games

        const interval = setInterval(() => {
            let loadedGames = document.querySelectorAll('.game_cell').length; // Current number of loaded games

            if (!allGamesLoaded()) {
                if (loadedGames === lastLoadedGames) {
                    // If the number of loaded games hasn't increased
                    sameCount++;
                    if (sameCount >= 3) { // Arbitrary number, adjust based on behavior (e.g., 3 checks)
                        clearInterval(interval);
                        window.scrollTo(0, 0);
                        console.log("Stopped trying to load more games - no new games loaded for several checks.");
                        callback();
                        return; // Exit the function early
                    }
                } else {
                    // If new games have loaded, reset the sameCount and update lastLoadedGames
                    sameCount = 0;
                    lastLoadedGames = loadedGames;
                }
                loadMoreGames();
            } else {
                // All games are loaded
                clearInterval(interval);
                let endTime = Date.now();
                let actualSeconds = (endTime - startTime) / 1000; // Calculate actual duration in seconds
                window.scrollTo(0, 0); // Scroll to the top of the page
                console.log(`Estimated loading time: ${estimatedSeconds.toFixed(2)} seconds.`);
                console.log(`Actual loading time: ${actualSeconds.toFixed(2)} seconds.`);
                callback(); // Run the callback function once all games are loaded
            }
        }, 2000); // Adjust the interval as needed
    }

    // Function to parse and sort games by price
    function sortGamesByPrice(ascending = true) {
        let games = document.querySelectorAll('.game_cell');
        let gameData = Array.from(games).map(game => {
            let priceString = game.querySelector('.price_value') ? game.querySelector('.price_value').innerText.trim() : "Free";
            let price = parseFloat(priceString.replace(/[^0-9.-]+/g, "")); // Convert price string to number
            if (isNaN(price)) price = 0; // Treat free or non-standard prices as 0 or decide on a convention
            return {element: game, price: price};
        });

        // Sort the array of game data by price
        gameData.sort((a, b) => ascending ? a.price - b.price : b.price - a.price);

        // Rearrange the game cells in the DOM
        const container = document.querySelector('.game_grid_widget'); // Using class to select the container
        container.innerHTML = ''; // Clear the container
        gameData.forEach(game => {
            container.appendChild(game.element); // Append each game element back to the container in sorted order
        });
    }

    // Function to parse and sort games by discount (sale_tag)
    function sortGamesByDiscount() {
        let games = document.querySelectorAll('.game_cell');
        let gameData = Array.from(games).map(game => {
            let discountText = game.querySelector('.sale_tag') ? game.querySelector('.sale_tag').innerText.trim().replace('%', '') : "0";
            let discount = parseFloat(discountText); // Convert discount text to number
            if (isNaN(discount)) discount = 0; // Treat no discount or non-standard texts as 0
            return {element: game, discount: discount};
        });

        // Sort the array of game data by discount, descending (higher discounts first)
        gameData.sort((a, b) => a.discount - b.discount);

        // Rearrange the game cells in the DOM
        const container = document.querySelector('.game_grid_widget'); // Ensure this selector is accurate
        container.innerHTML = ''; // Clear the container
        gameData.forEach(game => {
            container.appendChild(game.element); // Append each game element back to the container in sorted order
        });
    }

    // Function to highlight active button like the original buttons
    function updateActiveButton(clickedButton) {
        // Remove 'active' class from all buttons
        const allButtons = document.querySelectorAll('.ItchSortAndExportButtons');
        allButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Add 'active' class to the clicked button
        clickedButton.classList.add('active');
    }

    // Function to create and attach the sort buttons
    function createNewButtons() {
        // Locate the container for the sort options using class names
        const sortOptionsContainer = document.querySelector('.browse_sort_options_widget.base_widget ul.sorts');

        const loadAllButton = document.createElement('li');
        loadAllButton.innerHTML = `<button id="loadAllGames" class="ItchSortAndExportButtons">Load All Items (estm. ${estimatedMinutes.toFixed(1)} min)</button>`;
        loadAllButton.firstChild.addEventListener('click', function () {
            updateActiveButton(this); // Update active class on click
            continuouslyLoadGames(() => {
                console.log("All games loaded!");
                window.scrollTo(0, 0); // Scroll to the top of the page
                // Additional functionality after loading
            });
        });

        // Create the Low to High button
        const lowToHighButton = document.createElement('li');
        lowToHighButton.innerHTML = `<button id="sortLowToHigh" class="ItchSortAndExportButtons">Price: Low to High</button>`;
        lowToHighButton.firstChild.addEventListener('click', function () {
            updateActiveButton(this); // Update active class on click
            sortGamesByPrice(true); // Assuming sortGamesByPrice accepts a boolean for direction
        });


        // Create the High to Low button
        const highToLowButton = document.createElement('li');
        highToLowButton.innerHTML = `<button id="sortHighToLow" class="ItchSortAndExportButtons">Price: High to Low</button>`;
        highToLowButton.firstChild.addEventListener('click', function () {
            updateActiveButton(this); // Update active class on click
            sortGamesByPrice(false); // Assuming sortGamesByPrice accepts a boolean for direction
        });

        // Create the "Sort by Discount" button
        const sortByDiscountButton = document.createElement('li');
        sortByDiscountButton.innerHTML = `<button id="sortByDiscount" class="ItchSortAndExportButtons">Sort by Discount</button>`;
        sortByDiscountButton.firstChild.addEventListener('click', function () {
            updateActiveButton(this);
            sortGamesByDiscount(); // Linking to the sorting function
        });
        // Create the Export Game Data button
        const exportButton = document.createElement('li');
        exportButton.innerHTML = `<button id="exportGameData" class="ItchSortAndExportButtons">Export Item Data</button>`;
        exportButton.firstChild.addEventListener('click', function () {
            updateActiveButton(this); // Update active class on click
            continuouslyLoadGames(() => {
                const data = extractGameData();
                const csv = arrayToCSV(data);
                downloadCSV(csv);
            });
        });

        // Append the new buttons to the sort options container
        if (sortOptionsContainer) {
            sortOptionsContainer.appendChild(loadAllButton);
            sortOptionsContainer.appendChild(lowToHighButton);
            sortOptionsContainer.appendChild(highToLowButton);
            sortOptionsContainer.appendChild(sortByDiscountButton);
            sortOptionsContainer.appendChild(exportButton); // Append the Export button here
        } else {
            console.error("Sort options container not found!");
        }
    }

    // Function to extract game data
    function extractGameData() {
        let games = document.querySelectorAll('.game_cell'); // Select all game containers
        let gameData = [];

        games.forEach((game) => {
            // Define the data structure for each game
            let gameInfo = {
                id: game.getAttribute('data-game_id'),
                title: game.querySelector('.game_title a').innerText,
                url: game.querySelector('.game_title a').href,
                description: game.querySelector('.game_text') ? game.querySelector('.game_text').getAttribute('title') : "",
                price: game.querySelector('.game_text') ? game.querySelector('.game_text').getAttribute('title') : "",
                author: game.querySelector('.game_author a').innerText,
                authorUrl: game.querySelector('.game_author a').href,
                platforms: Array.from(game.querySelectorAll('.game_platform span')).map(span => span.getAttribute('title')),
                priceValue: game.querySelector('.price_value') ? game.querySelector('.price_value').innerText.trim() : "",
                saleTag: game.querySelector('.sale_tag') ? game.querySelector('.sale_tag').innerText.trim() : ""
            };
            gameData.push(gameInfo);
        });

        return gameData;
    }

    // Function to convert data array to CSV string
    function arrayToCSV(data) {
        const csvRows = [];
        const headers = Object.keys(data[0]);
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }

    // Function to download the data as CSV
    function downloadCSV(data) {
        const blob = new Blob([data], {type: 'text/csv'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'games.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // add buttons after page is loaded
    window.addEventListener('load', createNewButtons);

})();
