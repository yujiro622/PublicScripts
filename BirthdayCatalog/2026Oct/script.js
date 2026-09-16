// JSONファイルを読み込む
fetch("data.json")
    .then(response => response.json())
    .then(data => {
        const maxPrice = 10000 + 6000; // 最大金額の設定
        const container = document.getElementById("image-container");
        const cakeContainer = document.getElementById("cake-container");
        const cakeError = document.getElementById("cake-error");
        const selectedPrice = document.getElementById("selected-price");
        const selectedTableBody = document.querySelector("#selected-table tbody");
        const selectedTotalCell = document.getElementById("selected-total-cell");
        const tooMuchPopup = document.getElementById("too-much-popup");
        const cakeErrorPopup = document.getElementById("cake-error-popup");
        const successPopup = document.getElementById("success-popup");
        const resetButton = document.getElementById("button-reset");
        const okButton = document.getElementById("button-ok");
        const BACKGROUND_OPACITY = 0.1;

        document.body.style.setProperty("--bg-opacity", BACKGROUND_OPACITY.toString());

        const formatPrice = (price) => {
            return new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0
            }).format(price);
        };

        const applyDependencySelection = () => {
            const cards = Array.from(document.querySelectorAll(".image-card"));
            const cardsByImage = new Map(cards.map(card => [card.dataset.image, card]));
            const selectedImages = new Set(
                cards
                    .filter(card => card.classList.contains("selected"))
                    .map(card => card.dataset.image)
            );

            cards.forEach(card => {
                const requiredImages = JSON.parse(card.dataset.dependsOn || "[]");

                if (card.classList.contains("selected")) {
                    requiredImages.forEach(imagePath => {
                        const targetCard = cardsByImage.get(imagePath);
                        if (targetCard) {
                            selectedImages.add(imagePath);
                        }
                    });
                }
            });

            cards.forEach(card => {
                const isSelected = selectedImages.has(card.dataset.image);
                card.classList.toggle("selected", isSelected);
                card.classList.toggle("disabled", !isSelected);
            });
        };

        const updateTotalPrice = () => {
            const selectedCards = document.querySelectorAll(".image-card.selected");
            const total = Array.from(selectedCards).reduce((sum, card) => {
                return sum + Number(card.dataset.price || 0);
            }, 0);

            selectedPrice.textContent = `合計金額: ${formatPrice(total)}`;
        };

        const getSelectedItems = () => {
            const selectedCards = document.querySelectorAll(".image-card.selected");
            return Array.from(selectedCards).map(card => ({
                name: card.dataset.name,
                price: Number(card.dataset.price || 0),
                platform: card.dataset.platform
            }));
        };

        const showSuccessPopup = () => {
            const selectedItems = getSelectedItems();
            const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

            selectedTableBody.innerHTML = "";

            if (selectedItems.length === 0) {
                const row = document.createElement("tr");
                row.innerHTML = "<td colspan='3'>選択された商品はありません</td>";
                selectedTableBody.appendChild(row);
            } else {
                selectedItems.forEach(item => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${formatPrice(item.price)}</td>
                        <td>${item.platform}</td>
                    `;
                    selectedTableBody.appendChild(row);
                });
            }

            selectedTotalCell.textContent = formatPrice(total);
            tooMuchPopup.style.display = "none";
            cakeErrorPopup.style.display = "none";
            successPopup.style.display = "flex";
        };

        const showTooMuchWarning = () => {
            const total = getSelectedItems().reduce((sum, item) => sum + item.price, 0);

            if (total > maxPrice) {
                tooMuchPopup.style.display = "flex";
                return true;
            }

            tooMuchPopup.style.display = "none";
            return false;
        };

        const getSelectedCakes = () => {
            return cakeContainer.querySelectorAll(".image-card.selected");
        };

        const validateCakeSelection = () => {
            const hasSelectedCake = getSelectedCakes().length > 0;
            cakeErrorPopup.style.display = hasSelectedCake ? "none" : "flex";
            return hasSelectedCake;
        };

        tooMuchPopup.addEventListener("click", () => {
            tooMuchPopup.style.display = "none";
        });

        cakeErrorPopup.addEventListener("click", () => {
            cakeErrorPopup.style.display = "none";
        });

        successPopup.addEventListener("click", () => {
            successPopup.style.display = "none";
        });

        resetButton.addEventListener("click", () => {
            const cards = document.querySelectorAll(".image-card");

            cards.forEach(card => {
                card.classList.remove("selected");
                card.classList.add("disabled");
            });

            selectedTableBody.innerHTML = "";
            selectedTotalCell.textContent = "¥0";
            tooMuchPopup.style.display = "none";
            cakeErrorPopup.style.display = "none";
            successPopup.style.display = "none";
            updateTotalPrice();
        });

        okButton.addEventListener("click", () => {
            if (!validateCakeSelection()) {
                return;
            }

            const total = getSelectedItems().reduce((sum, item) => sum + item.price, 0);

            if (total > maxPrice) {
                showTooMuchWarning();
                return;
            }

            tooMuchPopup.style.display = "none";
            showSuccessPopup();
        });

        // JSONのデータから画像を作る
        data.forEach(item => {
            if (item.status === "disable") {
                return;
            }

            const card = document.createElement("div");
            card.classList.add("image-card", "disabled");
            card.dataset.image = item.image;
            card.dataset.name = item.name;
            card.dataset.price = item.price;
            card.dataset.platform = item.platform || "不明";
            card.dataset.dependsOn = JSON.stringify(item.dependsOn || []);
            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="image-name">${item.name}</div>
            `;

            // 画像をタップ・クリックしたとき
            card.addEventListener("click", () => {
                const isSelected = card.classList.contains("selected");

                if (item.tag === "cake" && !isSelected) {
                    cakeContainer.querySelectorAll(".image-card.selected").forEach(selectedCake => {
                        selectedCake.classList.remove("selected");
                        selectedCake.classList.add("disabled");
                    });
                }

                card.classList.toggle("selected", !isSelected);
                card.classList.toggle("disabled", isSelected);

                applyDependencySelection();
                if (item.tag === "cake" && !isSelected) {
                    cakeErrorPopup.style.display = "none";
                }
                updateTotalPrice();
            });

            // 画面に追加
            (item.tag === "cake" ? cakeContainer : container).appendChild(card);

        });

        updateTotalPrice();

    })
    .catch(error => {
        console.error("JSONの読み込みに失敗しました:", error);
    });