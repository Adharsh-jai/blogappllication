import os
import uuid

from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from werkzeug.utils import secure_filename


# --------------------------------------------------
# Load environment variables
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# Flask application
# --------------------------------------------------

app = Flask(__name__)


# --------------------------------------------------
# Configuration
# --------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")


app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Maximum upload size = 10 MB
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

# Upload directory
UPLOAD_FOLDER = os.path.join(app.root_path, "uploads")

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --------------------------------------------------
# Database
# --------------------------------------------------

db = SQLAlchemy(app)


# --------------------------------------------------
# Allowed image extensions
# --------------------------------------------------

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp"
}


def allowed_file(filename):
    """
    Check whether uploaded file has an allowed extension.
    """

    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


# --------------------------------------------------
# Database Model
# --------------------------------------------------

class Post(db.Model):

    __tablename__ = "posts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    image = db.Column(
        db.String(500),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    def to_dict(self):

        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "image": self.image,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            )
        }


# --------------------------------------------------
# Home page
# --------------------------------------------------

@app.route("/")
def index():

    return render_template("index.html")


# --------------------------------------------------
# CREATE POST
# --------------------------------------------------

@app.route("/api/posts", methods=["POST"])
def create_post():

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()

    # Validate title
    if not title:
        return jsonify({
            "error": "Title is required"
        }), 400

    # Validate description
    if not description:
        return jsonify({
            "error": "Description is required"
        }), 400

    image = request.files.get("image")

    image_filename = None

    if image and image.filename:

        if not allowed_file(image.filename):

            return jsonify({
                "error": "Invalid image format"
            }), 400

        original_filename = secure_filename(
            image.filename
        )

        extension = original_filename.rsplit(
            ".",
            1
        )[1].lower()

        # Generate unique filename
        image_filename = f"{uuid.uuid4().hex}.{extension}"

        image_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            image_filename
        )

        image.save(image_path)

    # Create database object
    post = Post(
        title=title,
        description=description,
        image=image_filename
    )

    db.session.add(post)

    db.session.commit()

    return jsonify({
        "message": "Post created successfully",
        "post": post.to_dict()
    }), 201


# --------------------------------------------------
# GET ALL POSTS
# --------------------------------------------------

@app.route("/api/posts", methods=["GET"])
def get_posts():

    posts = Post.query.order_by(
        Post.created_at.desc()
    ).all()

    return jsonify([
        post.to_dict()
        for post in posts
    ])


# --------------------------------------------------
# GET SINGLE POST
# --------------------------------------------------

@app.route("/api/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):

    post = db.session.get(Post, post_id)

    if not post:

        return jsonify({
            "error": "Post not found"
        }), 404

    return jsonify(post.to_dict())


# --------------------------------------------------
# UPDATE POST
# --------------------------------------------------

@app.route("/api/posts/<int:post_id>", methods=["PUT"])
def update_post(post_id):

    post = db.session.get(Post, post_id)

    if not post:

        return jsonify({
            "error": "Post not found"
        }), 404

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()

    if not title:

        return jsonify({
            "error": "Title is required"
        }), 400

    if not description:

        return jsonify({
            "error": "Description is required"
        }), 400

    # Update text fields
    post.title = title
    post.description = description

    # Check if a new image was uploaded
    image = request.files.get("image")

    if image and image.filename:

        if not allowed_file(image.filename):

            return jsonify({
                "error": "Invalid image format"
            }), 400

        # Delete old image
        if post.image:

            old_image_path = os.path.join(
                app.config["UPLOAD_FOLDER"],
                post.image
            )

            if os.path.exists(old_image_path):

                os.remove(old_image_path)

        original_filename = secure_filename(
            image.filename
        )

        extension = original_filename.rsplit(
            ".",
            1
        )[1].lower()

        new_filename = (
            f"{uuid.uuid4().hex}.{extension}"
        )

        new_image_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            new_filename
        )

        image.save(new_image_path)

        post.image = new_filename

    db.session.commit()

    return jsonify({
        "message": "Post updated successfully",
        "post": post.to_dict()
    })


# --------------------------------------------------
# DELETE POST
# --------------------------------------------------

@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):

    post = db.session.get(Post, post_id)

    if not post:

        return jsonify({
            "error": "Post not found"
        }), 404

    # Delete image from filesystem
    if post.image:

        image_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            post.image
        )

        if os.path.exists(image_path):

            os.remove(image_path)

    # Delete database record
    db.session.delete(post)

    db.session.commit()

    return jsonify({
        "message": "Post deleted successfully"
    })


# --------------------------------------------------
# Serve uploaded images
# --------------------------------------------------

@app.route("/uploads/<filename>")
def uploaded_file(filename):

    from flask import send_from_directory

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename
    )


# --------------------------------------------------
# Initialize database
# --------------------------------------------------

with app.app_context():

    db.create_all()


# --------------------------------------------------
# Run application
# --------------------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )