// ==========================================
// GLOBAL VARIABLES
// ==========================================

const postForm = document.getElementById("postForm");

const postModal = document.getElementById("postModal");

const postsContainer =
    document.getElementById("postsContainer");

const loading =
    document.getElementById("loading");

const emptyState =
    document.getElementById("emptyState");

const modalTitle =
    document.getElementById("modalTitle");

const submitBtn =
    document.getElementById("submitBtn");

const postId =
    document.getElementById("postId");

const titleInput =
    document.getElementById("title");

const descriptionInput =
    document.getElementById("description");

const imageInput =
    document.getElementById("image");

const imagePreview =
    document.getElementById("imagePreview");

const imagePreviewContainer =
    document.getElementById(
        "imagePreviewContainer"
    );


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadPosts();

    }
);


// ==========================================
// LOAD POSTS
// ==========================================

async function loadPosts() {

    try {

        loading.classList.remove("hidden");

        emptyState.classList.add("hidden");

        const response = await fetch(
            "/api/posts"
        );

        if (!response.ok) {

            throw new Error(
                "Failed to load posts"
            );
        }

        const posts = await response.json();

        renderPosts(posts);

    } catch (error) {

        console.error(error);

        postsContainer.innerHTML = `
            <p style="text-align:center;">
                Failed to load posts.
            </p>
        `;

    } finally {

        loading.classList.add("hidden");

    }
}


// ==========================================
// RENDER POSTS
// ==========================================

function renderPosts(posts) {

    postsContainer.innerHTML = "";

    if (posts.length === 0) {

        emptyState.classList.remove(
            "hidden"
        );

        return;
    }

    emptyState.classList.add(
        "hidden"
    );


    posts.forEach(function (post) {

        const card =
            document.createElement("article");

        card.className = "post-card";


        // Image

        let imageHTML = "";

        if (post.image) {

            imageHTML = `
                <img
                    class="post-image"
                    src="/uploads/${encodeURIComponent(post.image)}"
                    alt="${escapeHTML(post.title)}"
                >
            `;

        } else {

            imageHTML = `
                <div class="no-image">
                    No Image
                </div>
            `;
        }


        // Date

        let dateText = "";

        if (post.created_at) {

            const date =
                new Date(post.created_at);

            dateText =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                );
        }


        // Card HTML

        card.innerHTML = `

            ${imageHTML}

            <div class="post-content">

                <h2 class="post-title">
                    ${escapeHTML(post.title)}
                </h2>

                <p class="post-description">
                    ${escapeHTML(post.description)}
                </p>

                <div class="post-date">
                    ${dateText}
                </div>

                <div class="post-actions">

                    <button
                        class="edit-btn"
                        onclick="editPost(${post.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletePost(${post.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;


        postsContainer.appendChild(card);

    });
}


// ==========================================
// OPEN CREATE MODAL
// ==========================================

function openCreateModal() {

    postForm.reset();

    postId.value = "";

    modalTitle.textContent =
        "Create Post";

    submitBtn.textContent =
        "Create Post";

    imagePreviewContainer.classList.add(
        "hidden"
    );

    imagePreview.src = "";

    postModal.classList.remove(
        "hidden"
    );
}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeModal() {

    postModal.classList.add(
        "hidden"
    );

}


// ==========================================
// EDIT POST
// ==========================================

async function editPost(id) {

    try {

        const response = await fetch(
            `/api/posts/${id}`
        );

        if (!response.ok) {

            throw new Error(
                "Post not found"
            );
        }

        const post =
            await response.json();


        // Fill form

        postId.value =
            post.id;

        titleInput.value =
            post.title;

        descriptionInput.value =
            post.description;


        modalTitle.textContent =
            "Edit Post";

        submitBtn.textContent =
            "Update Post";


        // Existing image preview

        if (post.image) {

            imagePreview.src =
                `/uploads/${encodeURIComponent(post.image)}`;

            imagePreviewContainer.classList.remove(
                "hidden"
            );

        } else {

            imagePreviewContainer.classList.add(
                "hidden"
            );

        }


        postModal.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(error);

        alert(
            "Failed to load post."
        );

    }

}


// ==========================================
// IMAGE PREVIEW
// ==========================================

imageInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];

        if (!file) {

            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                imagePreview.src =
                    event.target.result;

                imagePreviewContainer.classList.remove(
                    "hidden"
                );

            };


        reader.readAsDataURL(file);

    }
);


// ==========================================
// FORM SUBMIT
// ==========================================

postForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const id =
            postId.value;


        const formData =
            new FormData();


        formData.append(
            "title",
            titleInput.value
        );


        formData.append(
            "description",
            descriptionInput.value
        );


        if (imageInput.files.length > 0) {

            formData.append(
                "image",
                imageInput.files[0]
            );

        }


        try {

            submitBtn.disabled = true;

            submitBtn.textContent =
                "Saving...";


            let response;


            if (id) {

                // UPDATE

                response = await fetch(
                    `/api/posts/${id}`,
                    {
                        method: "PUT",
                        body: formData
                    }
                );

            } else {

                // CREATE

                response = await fetch(
                    "/api/posts",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            }


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Something went wrong"
                );
            }


            closeModal();

            await loadPosts();


        } catch (error) {

            console.error(error);

            alert(
                error.message
            );

        } finally {

            submitBtn.disabled = false;

            submitBtn.textContent =
                id
                    ? "Update Post"
                    : "Create Post";
        }

    }
);


// ==========================================
// DELETE POST
// ==========================================

async function deletePost(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this post?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                `/api/posts/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to delete post"
            );
        }


        await loadPosts();


    } catch (error) {

        console.error(error);

        alert(
            error.message
        );
    }
}


// ==========================================
// ESCAPE HTML
// Prevent HTML injection when displaying text
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;
}


// ==========================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ==========================================

postModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target === postModal
        ) {

            closeModal();

        }

    }
);


// ==========================================
// ESC KEY CLOSE
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
            &&
            !postModal.classList.contains(
                "hidden"
            )
        ) {

            closeModal();

        }

    }
);