variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "encrypted-automerge"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-northeast-1"
}

variable "key_name" {
  type        = string
  description = "EC2 key pair name"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.micro"
}

variable "arch" {
  type        = string
  description = "CPU architecture for AMI selection (x86_64 or arm64)"
  default     = "x86_64"
}

variable "allowed_cidr_ssh" {
  type        = string
  description = "CIDR block allowed for SSH"
  default     = "0.0.0.0/0"
}

variable "allowed_cidr_app" {
  type        = string
  description = "CIDR block allowed for app port"
  default     = "0.0.0.0/0"
}

variable "image_repo_url" {
  type        = string
  description = "ECR repo URL (account.dkr.ecr.region.amazonaws.com/repo)"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag"
  default     = "latest"
}

