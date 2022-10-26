const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", { username: 1, name: 1 });
  response.json(blogs);
});

blogsRouter.get("/:id", (request, response, next) => {
  Blog.findById(request.params.id)
    .then((blog) => {
      if (blog) {
        response.json(blog);
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

blogsRouter.post("/", async (request, response, next) => {
  const body = request.body;
  const decodedToken = jwt.verify(request.token, process.env.SECRET);
  if (!request.token || !decodedToken.id) {
    return response.status(401).json({ error: "token invalid or missing. " });
  }
  const user = await User.findById(decodedToken.id);

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    user: user._id,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.json(savedBlog);
});

blogsRouter.delete("/:id", async (request, response, next) => {
  const body = request.body;
  const { id } = request.params;
  const decodedToken = jwt.verify(request.token, process.env.SECRET);
  if (!request.token || !decodedToken.id) {
    return response.status(401).json({ error: "token invalid or missing. " });
  }
  const user = await User.findById(decodedToken.id);
  const blog = await Blog.findById(id).populate("user", { id: 1 });
  if (!user) {
    response.status(400).json({ error: "user doesn't exist." });
  }
  if (user._id.toString() !== blog.user.id) {
    response.status(401).json({
      error: "no authorized for do that.",
      user: user._id,
      blogUser: blog.user.id,
    });
  }
  await Blog.findByIdAndRemove(id);
  response.status(204).end();
});

module.exports = blogsRouter;
